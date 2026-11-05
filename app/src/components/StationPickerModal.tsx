import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import type { Station } from "@/types/station";

type Props = {
  visible: boolean;
  stations: Station[];
  selectedId: string | null;
  onClose: () => void;
  onSelect: (station: Station) => void;
  onClear?: () => void;
};

export default function StationPickerModal({
  visible,
  stations,
  selectedId,
  onClose,
  onSelect,
  onClear,
}: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter(
      (s) =>
        s.station_id.toLowerCase().includes(q) ||
        s.station_name.toLowerCase().includes(q),
    );
  }, [query, stations]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/40">
        <View className="mt-auto max-h-[80%] rounded-t-3xl bg-white">
          <View className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4">
            <Text className="text-lg font-bold text-slate-900">
              Choose station
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
            >
              <Ionicons name="close" size={22} color="#475569" />
            </Pressable>
          </View>

          <View className="px-5 pb-2 pt-3">
            <View className="flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
              <Ionicons name="search" size={16} color="#94a3b8" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by id or name"
                autoCapitalize="none"
                className="ml-2 flex-1 py-2.5 text-base text-slate-900"
              />
              {query ? (
                <Pressable onPress={() => setQuery("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color="#94a3b8" />
                </Pressable>
              ) : null}
            </View>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(s) => s.station_id}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            ItemSeparatorComponent={() => <View className="h-2" />}
            ListEmptyComponent={
              <View className="items-center py-10">
                <Ionicons name="business-outline" size={32} color="#94a3b8" />
                <Text className="mt-2 text-sm text-slate-500">
                  {stations.length === 0
                    ? "No stations available."
                    : "No matches."}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const selected = item.station_id === selectedId;
              return (
                <Pressable
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className={`rounded-xl border p-3 ${
                    selected
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-100 bg-white active:bg-slate-50"
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-base font-semibold text-slate-900">
                        {item.station_name}
                      </Text>
                      <Text className="text-xs text-slate-500">
                        ID: {item.station_id}
                        {item.station_address
                          ? ` · ${item.station_address}`
                          : ""}
                      </Text>
                    </View>
                    {selected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#1858b8"
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            }}
          />

          {onClear && selectedId ? (
            <View className="border-t border-slate-100 px-5 py-3">
              <Pressable
                onPress={() => {
                  onClear();
                  onClose();
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 active:bg-slate-50"
              >
                <Text className="text-center text-sm font-semibold text-slate-700">
                  Clear station
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
