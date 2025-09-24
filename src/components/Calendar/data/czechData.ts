import type { Holiday, Nameday } from '../types';

// Data jsou nyní přímo v souboru, žádné externí volání.
const holidaysData2025: { date: string, name: string }[] = [
    { date: "1.1.", name: "Nový rok / Den obnovy samostatného českého státu" },
    { date: "7.4.", name: "Velikonoční pondělí" },
    { date: "1.5.", name: "Svátek práce" },
    { date: "8.5.", name: "Den vítězství" },
    { date: "5.7.", name: "Den slovanských věrozvěstů Cyrila a Metoděje" },
    { date: "6.7.", name: "Den upálení mistra Jana Husa" },
    { date: "28.9.", name: "Den české státnosti" },
    { date: "28.10.", name: "Den vzniku samostatného československého státu" },
    { date: "17.11.", name: "Den boje za svobodu a demokracii" },
    { date: "24.12.", name: "Štědrý den" },
    { date: "25.12.", name: "1. svátek vánoční" },
    { date: "26.12.", name: "2. svátek vánoční" }
];

// ZDE JE DEFINICE S 'S' NA KONCI
const namedaysData2025: { day: string, name: string }[] = [
    { day: "1.1", name: "Nový rok" }, { day: "2.1", name: "Karina" }, { day: "3.1", name: "Radmila" }, { day: "4.1", name: "Diana" }, { day: "5.1", name: "Dalimil" }, { day: "6.1", name: "Tři králové" }, { day: "7.1", name: "Vilma" },
    { day: "8.1", name: "Čestmír" }, { day: "9.1", name: "Vladan" }, { day: "10.1", name: "Břetislav" }, { day: "11.1", name: "Bohdana" }, { day: "12.1", name: "Pravoslav" }, { day: "13.1", name: "Edita" }, { day: "14.1", name: "Radovan" },
    { day: "15.1", name: "Alice" }, { day: "16.1", name: "Ctirad" }, { day: "17.1", name: "Drahoslav" }, { day: "18.1", name: "Vladislav" }, { day: "19.1", name: "Doubravka" }, { day: "20.1", name: "Ilona" }, { day: "21.1", name: "Běla" },
    { day: "22.1", name: "Slavomír" }, { day: "23.1", name: "Zdeněk" }, { day: "24.1", name: "Milena" }, { day: "25.1", name: "Miloš" }, { day: "26.1", name: "Zora" }, { day: "27.1", name: "Ingrid" }, { day: "28.1", name: "Otýlie" },
    { day: "29.1", name: "Zdislava" }, { day: "30.1", name: "Robin" }, { day: "31.1", name: "Marika" },
    { day: "1.2", name: "Hynek" }, { day: "2.2", name: "Nela" }, { day: "3.2", name: "Blažej" }, { day: "4.2", name: "Jarmila" }, { day: "5.2", name: "Dobromila" }, { day: "6.2", name: "Vanda" }, { day: "7.2", name: "Veronika" },
    // ... a tak dále pro celý rok
    { day: "23.9.", name: "Berta" }, { day: "24.9.", name: "Jaromír" }, { day: "25.9.", name: "Zlata" }, { day: "26.9.", name: "Andrea" }, { day: "27.9.", name: "Jonáš" }, { day: "28.9.", name: "Václav" }, { day: "29.9.", name: "Michal" },
    { day: "30.9.", name: "Jeroným" },
    { day: "24.12.", name: "Adam a Eva" }, { day: "25.12.", name: "Boží hod vánoční" }, { day: "26.12.", name: "Štěpán" }, { day: "31.12.", name: "Silvestr" }
];

export const fetchCzechHolidays = async (year: number): Promise<Holiday[]> => {
    return new Promise(resolve => {
        const holidays = holidaysData2025.map(holiday => {
            const [day, month] = holiday.date.split('.');
            const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            return {
                id: `holiday-${year}-${month}-${day}`, name: holiday.name, date: new Date(dateStr),
                type: 'national' as const, // Řekneme TS, že toto je konstanta, ne obecný string
                isPublic: true,
            };
        });
        resolve(holidays);
    });
};

export const fetchCzechNamedays = async (year: number): Promise<Nameday[]> => {
    return new Promise(resolve => {
        // ZDE JE OPRAVA - POUŽÍVÁME SPRÁVNÝ NÁZEV S 'S' NA KONCI
        const namedays = namedaysData2025.map(item => {
            const [day, month] = item.day.split('.');
            const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            const names = item.name.split(', ');
            return {
                id: `nameday-${dateStr}`, name: names[0], date: new Date(dateStr), names: names,
            };
        });
        resolve(namedays);
    });
};