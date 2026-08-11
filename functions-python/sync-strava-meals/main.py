import functions_framework
from flask import jsonify
import requests
from google.cloud import firestore

db = firestore.Client()

STRAVA_BASE_URL = "https://app.strava.cz"
STRAVA_API_URL = f"{STRAVA_BASE_URL}/api"


def get_credentials():
    doc = db.collection("appConfig").document("apiKeys").get()
    if not doc.exists:
        raise Exception("appConfig/apiKeys dokument neexistuje")
    data = doc.to_dict()
    return {
        "username": data.get("strava_username", ""),
        "password": data.get("strava_password", ""),
        "canteen": data.get("strava_canteen", ""),
    }


def strava_login(session, credentials):
    session.get(f"{STRAVA_BASE_URL}/en/prihlasit-se?jidelna")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Content-Type": "text/plain;charset=UTF-8",
        "Origin": STRAVA_BASE_URL,
        "Referer": f"{STRAVA_BASE_URL}/en/prihlasit-se?jidelna",
    }
    payload = {
        "cislo": credentials["canteen"],
        "jmeno": credentials["username"],
        "heslo": credentials["password"],
        "zustatPrihlasen": True,
        "environment": "W",
        "lang": "CZ",
    }
    resp = session.post(f"{STRAVA_API_URL}/login", json=payload, headers=headers)
    if resp.status_code != 200:
        raise Exception(f"Login failed: {resp.status_code}")
    data = resp.json()
    user = data.get("uzivatel", {})
    return {
        "sid": data.get("sid", ""),
        "s5url": data.get("s5url", ""),
        "balance": user.get("konto", 0.0),
        "canteen_name": user.get("nazevJidelny", ""),
        "full_name": user.get("jmeno", ""),
    }, headers


def fetch_menu(session, credentials, login_data, headers):
    payload = {
        "cislo": credentials["canteen"],
        "sid": login_data["sid"],
        "s5url": login_data["s5url"],
        "lang": "CZ",
        "konto": login_data["balance"],
        "podminka": "",
        "ignoreCert": False,
    }
    resp = session.post(f"{STRAVA_API_URL}/objednavky", json=payload, headers=headers)
    if resp.status_code != 200:
        raise Exception(f"Menu fetch failed: {resp.status_code}")
    raw = resp.json()
    meals = []
    for key, table in raw.items():
        if not key.startswith("table"):
            continue
        if not isinstance(table, list):
            continue
        for meal in table:
            if not meal.get("delsiPopis") and not meal.get("alergeny"):
                continue
            if meal.get("nazev") == meal.get("druh_popis"):
                continue
            restriction = meal.get("omezeniObj", {}).get("den", "")
            if "VP" in restriction:
                continue
            raw_date = meal.get("datum", "")
            if len(raw_date) >= 10:
                date = f"{raw_date[6:10]}-{raw_date[3:5]}-{raw_date[0:2]}"
            else:
                continue
            meal_type = meal.get("druh_popis", "")
            meals.append({
                "date": date,
                "type": meal_type,
                "name": meal.get("nazev", ""),
                "ordered": meal.get("pocet", 0) == 1,
                "price": float(meal.get("cena", 0)),
            })
    return meals


def strava_logout(session, credentials, login_data, headers):
    payload = {
        "sid": login_data["sid"],
        "cislo": credentials["canteen"],
        "url": login_data["s5url"],
        "lang": "CZ",
        "ignoreCert": "false",
    }
    try:
        session.post(f"{STRAVA_API_URL}/logOut", json=payload, headers=headers)
    except Exception:
        pass


@functions_framework.http
def sync_strava_meals(request):
    if request.method == "OPTIONS":
        return ("", 204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST",
            "Access-Control-Allow-Headers": "Content-Type",
        })
    cors_headers = {"Access-Control-Allow-Origin": "*"}
    try:
        credentials = get_credentials()
        if not credentials["username"] or not credentials["password"]:
            return jsonify({"error": "Chybi strava.cz credentials v Firestore"}), 400, cors_headers
        session = requests.Session()
        login_data, headers = strava_login(session, credentials)
        meals = fetch_menu(session, credentials, login_data, headers)
        strava_logout(session, credentials, login_data, headers)
        ordered_by_date = {}
        for meal in meals:
            date = meal["date"]
            if meal["ordered"]:
                if date not in ordered_by_date:
                    ordered_by_date[date] = []
                ordered_by_date[date].append({
                    "type": meal["type"],
                    "name": meal["name"],
                    "price": meal["price"],
                })
        doc_ref = db.collection("mealOrders").document("johanka")
        doc_ref.set({
            "orders": ordered_by_date,
            "lastSync": firestore.SERVER_TIMESTAMP,
            "canteenName": login_data["canteen_name"],
            "userName": login_data["full_name"],
            "balance": login_data["balance"],
        })
        return jsonify({
            "success": True,
            "orderedDays": len(ordered_by_date),
            "totalMeals": len(meals),
            "balance": login_data["balance"],
            "orders": ordered_by_date,
        }), 200, cors_headers
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500, cors_headers
