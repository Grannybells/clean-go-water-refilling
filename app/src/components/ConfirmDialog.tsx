import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
};

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onCancel,
  onConfirm,
}: Props) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => (!busy ? onCancel() : undefined)}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-8">
        <View className="w-full max-w-md rounded-2xl bg-white p-5 shadow">
          <Text className="text-lg font-bold text-slate-900">{title}</Text>
          <Text className="mt-2 text-sm text-slate-600">{message}</Text>
          <View className="mt-5 flex-row gap-3">
            <Pressable
              onPress={onCancel}
              disabled={busy}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 active:bg-slate-50"
            >
              <Text className="text-center text-base font-semibold text-slate-700">
                {cancelLabel}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              disabled={busy}
              className={`flex-1 rounded-xl px-4 py-3 ${
                busy
                  ? "bg-slate-300"
                  : destructive
                    ? "bg-red-600 active:bg-red-700"
                    : "bg-brand-600 active:bg-brand-700"
              }`}
            >
              {busy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-center text-base font-semibold text-white">
                  {confirmLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
