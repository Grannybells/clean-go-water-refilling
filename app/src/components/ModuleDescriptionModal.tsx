import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiError } from "@/lib/api";
import {
  updateModuleDescription,
  type ModuleEntry,
} from "@/lib/modulesCatalog";

type Props = {
  visible: boolean;
  module: ModuleEntry | null;
  onClose: () => void;
  onSaved: (updated: ModuleEntry) => void;
};

export default function ModuleDescriptionModal({
  visible,
  module,
  onClose,
  onSaved,
}: Props) {
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDescription(module?.description ?? "");
    setError(null);
  }, [visible, module]);

  async function save(value: string | null) {
    if (!module || saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateModuleDescription(module.module_name, value);
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not update module.",
      );
    } finally {
      setSaving(false);
    }
  }

  const trimmed = description.trim();
  const unchanged = trimmed === (module?.description ?? "");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 items-center justify-center bg-black/50 px-6"
      >
        <View className="w-full max-w-md rounded-2xl bg-white p-5 shadow">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-lg font-bold text-slate-900">
                Edit description
              </Text>
              <Text className="mt-0.5 text-xs text-slate-500">
                {module?.module_name}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              disabled={saving}
              hitSlop={10}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
            >
              <Ionicons name="close" size={22} color="#475569" />
            </Pressable>
          </View>

          <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
            Description
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            editable={!saving}
            multiline
            placeholder="Human-readable UI copy for this module"
            className="min-h-[88px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
          />
          <Text className="mt-1 text-[11px] text-slate-500">
            Note: this value is overwritten the next time{" "}
            <Text className="font-mono">npm run seed:modules</Text> runs. For
            permanent wording, also update{" "}
            <Text className="font-mono">src/config/modules.ts</Text>.
          </Text>

          {error ? (
            <View className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          ) : null}

          <View className="mt-5 flex-row gap-3">
            <Pressable
              onPress={() => save(null)}
              disabled={saving || (module?.description ?? null) === null}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 active:bg-slate-50"
            >
              <Text className="text-center text-sm font-semibold text-slate-700">
                Clear
              </Text>
            </Pressable>
            <Pressable
              onPress={() => save(trimmed || null)}
              disabled={saving || unchanged}
              className={`flex-1 rounded-xl px-4 py-3 ${
                saving || unchanged
                  ? "bg-brand-500/50"
                  : "bg-brand-600 active:bg-brand-700"
              }`}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-center text-sm font-semibold text-white">
                  Save
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
