// src/services/houseService.ts
import { db } from '../../config/firebase';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import type {
  House,
  Floor,
  Room,
  DevicePlacement,
  RoomType,
} from '../../types/visualization';
import { ROOM_CONFIGS } from '../../types/index';
import { DEFAULT_FLOORS } from '../../types/visualization';

class HouseService {
  private housesCollection = 'houses';
  private floorsCollection = 'floors';
  private roomsCollection = 'rooms';

  /**
   * 🏠 Vytvoří ukázkový dům pro nového uživatele
   */
  async createDefaultHouse(userId: string): Promise<House> {
    console.log('🏗️ Vytvářím ukázkový dům...');

    const houseId = `house-${userId}`;
    const now = Date.now();

    // Vytvoř patra
    const floors: Floor[] = [
      {
        id: DEFAULT_FLOORS.cellar.id,
        name: DEFAULT_FLOORS.cellar.name,
        level: DEFAULT_FLOORS.cellar.level,
        houseId,
        rooms: [],
        color: DEFAULT_FLOORS.cellar.color,
      },
      {
        id: DEFAULT_FLOORS.ground.id,
        name: DEFAULT_FLOORS.ground.name,
        level: DEFAULT_FLOORS.ground.level,
        houseId,
        rooms: [],
        color: DEFAULT_FLOORS.ground.color,
      },
      {
        id: DEFAULT_FLOORS.first.id,
        name: DEFAULT_FLOORS.first.name,
        level: DEFAULT_FLOORS.first.level,
        houseId,
        rooms: [],
        color: DEFAULT_FLOORS.first.color,
      },
      {
        id: DEFAULT_FLOORS.garden.id,
        name: DEFAULT_FLOORS.garden.name,
        level: DEFAULT_FLOORS.garden.level,
        houseId,
        rooms: [],
        color: DEFAULT_FLOORS.garden.color,
      },
    ];

    // Vytvoř místnosti pro přízemí
    const groundFloorRooms: Room[] = [
      this.createRoom('living-room', DEFAULT_FLOORS.ground.id, houseId, {
        x: 5,
        y: 5,
        width: 40,
        height: 45,
      }),
      this.createRoom('bedroom', DEFAULT_FLOORS.ground.id, houseId, {
        x: 50,
        y: 5,
        width: 45,
        height: 45,
      }),
      this.createRoom('hallway', DEFAULT_FLOORS.ground.id, houseId, {
        x: 5,
        y: 55,
        width: 90,
        height: 20,
      }),
      this.createRoom('toilet', DEFAULT_FLOORS.ground.id, houseId, {
        x: 5,
        y: 80,
        width: 20,
        height: 15,
      }),
    ];

    // Přiřaď místnosti k patru
    floors[1].rooms = groundFloorRooms.map((r) => r.id);

    // Uložení do Firestore
    const house: House = {
      id: houseId,
      name: 'Můj dům',
      userId,
      floors: floors.map((f) => f.id),
      devicePlacements: [],
      createdAt: now,
      updatedAt: now,
    };

    // Uložit dům
    await setDoc(doc(db, this.housesCollection, houseId), house);

    // Uložit patra
    for (const floor of floors) {
      await setDoc(
        doc(db, this.floorsCollection, floor.id),
        floor
      );
    }

    // Uložit místnosti
    for (const room of groundFloorRooms) {
      await setDoc(
        doc(db, this.roomsCollection, room.id),
        room
      );
    }

    console.log('✅ Ukázkový dům vytvořen');
    return house;
  }

  /**
   * 📦 Vytvoří místnost podle typu
   */
  private createRoom(
    type: RoomType,
    floorId: string,
    houseId: string,
    layout: { x: number; y: number; width: number; height: number }
  ): Room {
    const config = ROOM_CONFIGS[type];
    const roomId = `room-${houseId}-${floorId}-${type}-${Date.now()}`;

    return {
      id: roomId,
      name: config.defaultName,
      type,
      floorId,
      position: { x: layout.x, y: layout.y },
      size: { width: layout.width, height: layout.height },
      color: config.defaultColor,
      icon: config.defaultIcon,
      devices: [],
      userId: '',  // Bude nastaveno při ukládání do Firestore
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * 🔍 Načte dům uživatele
   */
  async getHouse(userId: string): Promise<House | null> {
    try {
      const houseId = `house-${userId}`;
      const houseDoc = await getDoc(
        doc(db, this.housesCollection, houseId)
      );

      if (!houseDoc.exists()) {
        return null;
      }

      return houseDoc.data() as House;
    } catch (error) {
      console.error('❌ Chyba při načítání domu:', error);
      throw error;
    }
  }

  /**
   * 📡 Subscribe k domu (real-time)
   */
  subscribeToHouse(
    userId: string,
    callback: (house: House | null) => void
  ): () => void {
    const houseId = `house-${userId}`;
    const houseRef = doc(db, this.housesCollection, houseId);

    return onSnapshot(
      houseRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data() as House);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('❌ Chyba při odběru domu:', error);
        callback(null);
      }
    );
  }

  /**
   * 🏢 Načte patro podle ID
   */
  async getFloor(floorId: string): Promise<Floor | null> {
    try {
      const floorDoc = await getDoc(
        doc(db, this.floorsCollection, floorId)
      );

      if (!floorDoc.exists()) {
        return null;
      }

      return floorDoc.data() as Floor;
    } catch (error) {
      console.error('❌ Chyba při načítání patra:', error);
      throw error;
    }
  }

  /**
   * 📡 Subscribe k patru (real-time)
   */
  subscribeToFloor(
    floorId: string,
    callback: (floor: Floor | null) => void
  ): () => void {
    const floorRef = doc(db, this.floorsCollection, floorId);

    return onSnapshot(
      floorRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data() as Floor);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('❌ Chyba při odběru patra:', error);
        callback(null);
      }
    );
  }

  /**
   * 🚪 Načte místnost podle ID
   */
  async getRoom(roomId: string): Promise<Room | null> {
    try {
      const roomDoc = await getDoc(
        doc(db, this.roomsCollection, roomId)
      );

      if (!roomDoc.exists()) {
        return null;
      }

      return roomDoc.data() as Room;
    } catch (error) {
      console.error('❌ Chyba při načítání místnosti:', error);
      throw error;
    }
  }

  /**
   * 📡 Subscribe k místnosti (real-time)
   */
  subscribeToRoom(
    roomId: string,
    callback: (room: Room | null) => void
  ): () => void {
    const roomRef = doc(db, this.roomsCollection, roomId);

    return onSnapshot(
      roomRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data() as Room);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('❌ Chyba při odběru místnosti:', error);
        callback(null);
      }
    );
  }

  /**
   * 📌 Umístí zařízení do místnosti
   */
  async placeDeviceInRoom(
    userId: string,
    deviceId: string,
    roomId: string,
    position: { x: number; y: number }
  ): Promise<void> {
    try {
      const houseId = `house-${userId}`;
      const houseRef = doc(db, this.housesCollection, houseId);
      const house = await this.getHouse(userId);

      if (!house) {
        throw new Error('Dům nenalezen');
      }

      // Odstraň zařízení z jiných místností
      const filteredPlacements = house.devicePlacements.filter(
        (p) => p.deviceId !== deviceId
      );

      // Přidej nové umístění
      const newPlacement: DevicePlacement = {
        deviceId,
        roomId,
        position,
      };

      // Aktualizuj místnost
      const room = await this.getRoom(roomId);
      if (room && !room.devices.includes(deviceId)) {
        room.devices.push(deviceId);
        await setDoc(
          doc(db, this.roomsCollection, roomId),
          room
        );
      }

      // Aktualizuj dům
      await updateDoc(houseRef, {
        devicePlacements: [...filteredPlacements, newPlacement],
        updatedAt: Date.now(),
      });

      console.log(`✅ Zařízení ${deviceId} umístěno do ${roomId}`);
    } catch (error) {
      console.error('❌ Chyba při umísťování zařízení:', error);
      throw error;
    }
  }

  /**
   * 🗑️ Odstraní zařízení z místnosti
   */
  async removeDeviceFromRoom(
    userId: string,
    deviceId: string
  ): Promise<void> {
    try {
      const houseId = `house-${userId}`;
      const houseRef = doc(db, this.housesCollection, houseId);
      const house = await this.getHouse(userId);

      if (!house) {
        throw new Error('Dům nenalezen');
      }

      // Najdi místnost, kde zařízení je
      const placement = house.devicePlacements.find(
        (p) => p.deviceId === deviceId
      );

      if (placement) {
        // Odstraň z místnosti
        const room = await this.getRoom(placement.roomId);
        if (room) {
          room.devices = room.devices.filter((id) => id !== deviceId);
          await setDoc(
            doc(db, this.roomsCollection, placement.roomId),
            room
          );
        }
      }

      // Odstraň umístění z domu
      const filteredPlacements = house.devicePlacements.filter(
        (p) => p.deviceId !== deviceId
      );

      await updateDoc(houseRef, {
        devicePlacements: filteredPlacements,
        updatedAt: Date.now(),
      });

      console.log(`✅ Zařízení ${deviceId} odstraněno`);
    } catch (error) {
      console.error('❌ Chyba při odstraňování zařízení:', error);
      throw error;
    }
  }

  /**
   * 📝 Přejmenuje místnost
   */
  async renameRoom(roomId: string, newName: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.roomsCollection, roomId), {
        name: newName,
      });
      console.log(`✅ Místnost ${roomId} přejmenována na ${newName}`);
    } catch (error) {
      console.error('❌ Chyba při přejmenování místnosti:', error);
      throw error;
    }
  }
}

export const houseService = new HouseService();
