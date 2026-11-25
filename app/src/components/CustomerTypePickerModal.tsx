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

import type { CustomerType } from "@/types/customer";

type Props = {
  visible: boolean;
  types: CustomerType[];
  selectedRefno: string | null;
  onClose: () => void;
  onSelect: (type: CustomerType) => void;
};

export default function CustomerTypePickerModal({
  visible,
  types,
  selectedRefno,
  onClose,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return types;
    return types.filter(
      (t) =>
        t.customer_refno.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q),
    );
  }, [query, types]);

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
              Choose customer type
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
                placeholder="Search by code or label"
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
            keyExtractor={(t) => t.customer_refno}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            ItemSeparatorComponent={() => <View className="h-2" />}
            ListEmptyComponent={
              <View className="items-center py-10">
                <Ionicons name="pricetag-outline" size={32} color="#94a3b8" />
                <Text className="mt-2 text-sm text-slate-500">
                  {types.length === 0
                    ? "No customer types available."
                    : "No matches."}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const selected = item.customer_refno === selectedRefno;
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
                        {item.type}
                      </Text>
                      <Text className="text-xs text-slate-500">
                        Code: {item.customer_refno}
                        {item.description ? ` · ${item.description}` : ""}
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
        </View>
      </View>
    </Modal>
  );
}
