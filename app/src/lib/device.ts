import * as Application from "expo-application";
import * as Device from "expo-device";
import { Platform } from "react-native";

import { secureStorage } from "./secureStorage";

const DEVICE_ID_KEY = "device.id";

function randomUUID(): string {
  const hex = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      out += "-";
    } else if (i === 14) {
      out += "4";
    } else if (i === 19) {
      out += hex[((Math.random() * 4) | 0) + 8];
    } else {
      out += hex[(Math.random() * 16) | 0];
    }
  }
  return out;
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await secureStorage.getItem(DEVICE_ID_KEY);
  if (existing && existing.length > 0) return existing;
  const next = randomUUID();
  await secureStorage.setItem(DEVICE_ID_KEY, next);
  return next;
}

export interface DeviceInfo {
  device_id: string;
  device_name: string | null;
  device_model: string | null;
  os_name: string | null;
  os_version: string | null;
  app_version: string | null;
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
  const device_id = await getOrCreateDeviceId();
  return {
    device_id,
    device_name: Device.deviceName ?? null,
    device_model: Device.modelName ?? null,
    os_name: Device.osName ?? Platform.OS,
    os_version: Device.osVersion ?? String(Platform.Version),
    app_version: Application.nativeApplicationVersion ?? null,
  };
}
