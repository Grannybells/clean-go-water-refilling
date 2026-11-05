import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import {
  addModuleToGroup,
  createModuleGroup,
  deleteModuleGroup,
  getModuleGroup,
  removeModuleFromGroup,
  renameModuleGroup,
  type ModuleGroupDetail,
  type ModuleGroupSummary,
} from "@/lib/moduleGroups";
import { listModules, type ModuleEntry } from "@/lib/modulesCatalog";

type Props = {
  visible: boolean;
  group: ModuleGroupSummary | null;
  onClose: () => void;
  onSaved: (group: ModuleGroupDetail) => void;
  onDeleted: (name: string) => void;
};

const NAME_RE = /^[A-Za-z0-9_-]{1,100}$/;

function groupModulesByPage(entries: ModuleEntry[]): Record<string, ModuleEntry[]> {
  const out: Record<string, ModuleEntry[]> = {};
  for (const e of entries) {
    if (!out[e.page]) out[e.page] = [];
    out[e.page].push(e);
  }
  return out;
}

export default function GroupManageModal({
  visible,
  group,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const { hasModule, refresh } = useAuth();
  const isCreate = group === null;

  const [detail, setDetail] = useState<ModuleGroupDetail | null>(null);
  const [catalog, setCatalog] = useState<ModuleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Create form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());

  // Rename state (edit mode)
  const [renameValue, setRenameValue] = useState("");

  const canCreate = hasModule("settings.groups.create");
  const canEdit = hasModule("settings.groups.edit");
  const canDelete = hasModule("settings.groups.delete");

  const reserved = detail?.is_reserved ?? false;

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setConfirmDelete(false);
    setLoading(true);
    void (async () => {
      try {
        const [cat, g] = await Promise.all([
          listModules(),
          isCreate ? Promise.resolve(null) : getModuleGroup(group!.group_name),
        ]);
        setCatalog(cat);
        setDetail(g);
        if (g) {
          setRenameValue(g.group_name);
          setName("");
          setDescription("");
          setSelectedModules(new Set());
        } else {
          setName("");
          setDescription("");
          setSelectedModules(new Set());
          setRenameValue("");
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load.");
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, isCreate, group]);

  const catalogByPage = useMemo(() => groupModulesByPage(catalog), [catalog]);
  const currentModules = useMemo(
    () => new Set(detail?.modules ?? []),
    [detail],
  );

  function toggleSelected(name: string) {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function handleCreate() {
    if (busy) return;
    const trimmed = name.trim();
    if (!NAME_RE.test(trimmed)) {
      setError("Group name: 1–100 chars, letters/digits/underscore/hyphen.");
      return;
    }
    if (selectedModules.size === 0) {
      setError("Pick at least one module.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createModuleGroup({
        group_name: trimmed,
        modules: Array.from(selectedModules),
        description: description.trim() || undefined,
      });
      onSaved(created);
      await refresh();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRename() {
    if (busy || !detail) return;
    const newName = renameValue.trim();
    if (!NAME_RE.test(newName)) {
      setError("New name: 1–100 chars, letters/digits/underscore/hyphen.");
      return;
    }
    if (newName === detail.group_name) return;
    setBusy(true);
    setError(null);
    try {
      const renamed = await renameModuleGroup(detail.group_name, newName);
      setDetail(renamed);
      onSaved(renamed);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not rename.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleModule(moduleName: string) {
    if (busy || !detail || reserved || !canEdit) return;
    setBusy(true);
    setError(null);
    try {
      const updated = currentModules.has(moduleName)
        ? await removeModuleFromGroup(detail.group_name, moduleName)
        : await addModuleToGroup(detail.group_name, moduleName);
      setDetail(updated);
      onSaved(updated);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!detail) return;
    try {
      await deleteModuleGroup(detail.group_name);
      onDeleted(detail.group_name);
      setConfirmDelete(false);
      await refresh();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete.");
      setConfirmDelete(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 bg-black/40"
      >
        <View className="mt-auto max-h-[92%] rounded-t-3xl bg-white">
          <View className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4">
            <View className="flex-1 pr-3">
              <Text className="text-lg font-bold text-slate-900">
                {isCreate ? "New group" : detail?.group_name ?? "Group"}
              </Text>
              <Text className="text-xs text-slate-500">
                {isCreate
                  ? "Bundle modules for easy assignment."
                  : detail
                    ? `${detail.user_count} user${detail.user_count === 1 ? "" : "s"} · ${detail.modules.length} module${detail.modules.length === 1 ? "" : "s"}`
                    : ""}
              </Text>
            </View>
            {reserved ? (
              <View className="mr-2 rounded-full bg-amber-100 px-2 py-0.5">
                <Text className="text-[10px] font-semibold uppercase text-amber-700">
                  reserved
                </Text>
              </View>
            ) : null}
            <Pressable
              onPress={onClose}
              disabled={busy}
              hitSlop={10}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
            >
              <Ionicons name="close" size={22} color="#475569" />
            </Pressable>
          </View>

          {loading ? (
            <View className="items-center justify-center py-16">
              <ActivityIndicator />
            </View>
          ) : (
            <ScrollView
              className="px-5"
              contentContainerStyle={{ paddingVertical: 20, paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              {isCreate ? (
                <>
                  <Text className="mb-1 text-sm font-medium text-slate-700">
                    Group name
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!busy && canCreate}
                    placeholder="cashier_bundle"
                    maxLength={100}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
                  />

                  <Text className="mb-1 mt-4 text-sm font-medium text-slate-700">
                    Description <Text className="text-slate-400">(optional)</Text>
                  </Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    editable={!busy && canCreate}
                    multiline
                    placeholder="Cashier bundle for POS staff"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
                  />
                </>
              ) : detail ? (
                <>
                  {reserved ? (
                    <View className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <Text className="text-sm text-amber-800">
                        Reserved groups are managed by seed scripts. Edit
                        <Text className="font-semibold"> DEFAULT_GROUPS </Text>
                        in <Text className="font-mono">src/config/modules.ts</Text>{" "}
                        and re-run <Text className="font-mono">npm run seed:modules</Text>.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text className="mb-1 text-sm font-medium text-slate-700">
                        Rename group
                      </Text>
                      <View className="flex-row gap-2">
                        <TextInput
                          value={renameValue}
                          onChangeText={setRenameValue}
                          autoCapitalize="none"
                          autoCorrect={false}
                          editable={!busy && canEdit}
                          maxLength={100}
                          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
                        />
                        <Pressable
                          onPress={handleRename}
                          disabled={
                            busy ||
                            !canEdit ||
                            renameValue.trim() === detail.group_name
                          }
                          className={`rounded-xl px-4 py-3 ${
                            busy ||
                            !canEdit ||
                            renameValue.trim() === detail.group_name
                              ? "bg-slate-300"
                              : "bg-brand-600 active:bg-brand-700"
                          }`}
                        >
                          <Text className="text-base font-semibold text-white">
                            Rename
                          </Text>
                        </Pressable>
                      </View>
                    </>
                  )}

                  {detail.description ? (
                    <Text className="mt-3 text-xs text-slate-500">
                      {detail.description}
                    </Text>
                  ) : null}
                </>
              ) : null}

              <Text className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Modules
              </Text>
              {Object.entries(catalogByPage).map(([page, items]) => (
                <View key={page} className="mb-3">
                  <Text className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                    {page}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {items.map((m) => {
                      const inGroup = isCreate
                        ? selectedModules.has(m.module_name)
                        : currentModules.has(m.module_name);
                      const disabled =
                        busy ||
                        (isCreate ? !canCreate : reserved || !canEdit);
                      return (
                        <Pressable
                          key={m.module_name}
                          onPress={() =>
                            isCreate
                              ? toggleSelected(m.module_name)
                              : toggleModule(m.module_name)
                          }
                          disabled={disabled}
                          className={`flex-row items-center gap-1 rounded-full border px-3 py-1.5 ${
                            inGroup
                              ? "border-brand-500 bg-brand-100"
                              : "border-slate-200 bg-white"
                          } ${disabled ? "opacity-60" : "active:bg-brand-50"}`}
                        >
                          <Ionicons
                            name={inGroup ? "checkmark-circle" : "add-circle-outline"}
                            size={14}
                            color={inGroup ? "#1858b8" : "#64748b"}
                          />
                          <Text
                            className={`text-xs ${
                              inGroup
                                ? "font-semibold text-brand-700"
                                : "font-medium text-slate-700"
                            }`}
                          >
                            {m.module_name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}

              {error ? (
                <View className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                  <Text className="text-sm text-red-700">{error}</Text>
                </View>
              ) : null}

              {isCreate ? (
                <View className="mt-6 flex-row gap-3">
                  <Pressable
                    onPress={onClose}
                    disabled={busy}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 active:bg-slate-50"
                  >
                    <Text className="text-center text-base font-semibold text-slate-700">
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleCreate}
                    disabled={
                      busy ||
                      !canCreate ||
                      name.trim() === "" ||
                      selectedModules.size === 0
                    }
                    className={`flex-1 rounded-xl px-4 py-3 ${
                      busy ||
                      !canCreate ||
                      name.trim() === "" ||
                      selectedModules.size === 0
                        ? "bg-brand-500/50"
                        : "bg-brand-600 active:bg-brand-700"
                    }`}
                  >
                    {busy ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text className="text-center text-base font-semibold text-white">
                        Create group
                      </Text>
                    )}
                  </Pressable>
                </View>
              ) : !reserved && canDelete ? (
                <Pressable
                  onPress={() => setConfirmDelete(true)}
                  disabled={busy}
                  className="mt-6 rounded-xl border border-red-200 bg-white px-4 py-3 active:bg-red-50"
                >
                  <Text className="text-center text-base font-semibold text-red-700">
                    Delete group
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete group?"
        message={
          detail
            ? `This deletes "${detail.group_name}" and removes ${detail.user_count} user${detail.user_count === 1 ? "" : "s"} from it.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </Modal>
  );
}
