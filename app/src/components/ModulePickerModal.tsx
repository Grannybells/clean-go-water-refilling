import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { FlatList } from "react-native";

import { ApiError } from "@/lib/api";
import { listModules, type ModuleEntry } from "@/lib/modulesCatalog";

type Props = {
  visible: boolean;
  excludeNames: string[];
  onClose: () => void;
  onPick: (moduleName: string) => Promise<void> | void;
};

export default function ModulePickerModal({
  visible,
  excludeNames,
  onClose,
  onPick,
}: Props) {
  const [catalog, setCatalog] = useState<ModuleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setQuery("");
    setLoading(true);
    void (async () => {
      try {
        setCatalog(await listModules());
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load modules.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  const excluded = useMemo(() => new Set(excludeNames), [excludeNames]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .filter((m) => !excluded.has(m.module_name))
      .filter(
        (m) =>
          !q ||
          m.module_name.toLowerCase().includes(q) ||
          (m.description ?? "").toLowerCase().includes(q),
      );
  }, [catalog, excluded, query]);

  async function handlePick(name: string) {
    setPicking(name);
    setError(null);
    try {
      await onPick(name);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not grant.");
    } finally {
      setPicking(null);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/40">
        <View className="mt-auto max-h-[85%] rounded-t-3xl bg-white">
          <View className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4">
            <View>
              <Text className="text-lg font-bold text-slate-900">
                Grant module
              </Text>
              <Text className="text-xs text-slate-500">
                A direct grant is independent of any group.
              </Text>
            </View>
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
                placeholder="Search module or description"
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

          {loading ? (
            <View className="py-16">
              <ActivityIndicator />
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(m) => m.module_name}
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
              ItemSeparatorComponent={() => <View className="h-2" />}
              ListHeaderComponent={
                error ? (
                  <View className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
                    <Text className="text-sm text-red-700">{error}</Text>
                  </View>
                ) : undefined
              }
              ListEmptyComponent={
                <View className="items-center py-10">
                  <Ionicons name="grid-outline" size={32} color="#94a3b8" />
                  <Text className="mt-2 text-sm text-slate-500">
                    {catalog.length === 0
                      ? "No modules available."
                      : "Nothing left to grant."}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const busy = picking === item.module_name;
                return (
                  <Pressable
                    onPress={() => handlePick(item.module_name)}
                    disabled={picking !== null}
                    className="rounded-xl border border-slate-100 bg-white p-3 active:bg-brand-50"
                  >
                    <View className="flex-row items-center">
                      <View className="flex-1 pr-3">
                        <Text className="text-sm font-semibold text-slate-800">
                          {item.module_name}
                        </Text>
                        {item.description ? (
                          <Text className="text-[11px] text-slate-500">
                            {item.description}
                          </Text>
                        ) : null}
                      </View>
                      {busy ? (
                        <ActivityIndicator />
                      ) : (
                        <Ionicons
                          name="add-circle"
                          size={22}
                          color="#1858b8"
                        />
                      )}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
