import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import ConfirmDialog from "@/components/ConfirmDialog";
import GroupPickerModal from "@/components/GroupPickerModal";
import ModulePickerModal from "@/components/ModulePickerModal";
import RoleChangeModal from "@/components/RoleChangeModal";
import UserProfileEditModal from "@/components/UserProfileEditModal";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import {
  assignUserGroup,
  getUser,
  grantUserModule,
  removeUserGroup,
  revokeUserModule,
  type UserDetail,
} from "@/lib/users";
import type { User } from "@/types/user";

function roleStyle(role: string): { bg: string; fg: string } {
  switch (role) {
    case "owner":
      return { bg: "bg-amber-100", fg: "text-amber-800" };
    case "admin":
      return { bg: "bg-brand-100", fg: "text-brand-700" };
    case "operator":
      return { bg: "bg-emerald-100", fg: "text-emerald-800" };
    default:
      return { bg: "bg-slate-200", fg: "text-slate-700" };
  }
}

function initials(first: string, last: string, email: string): string {
  const a = first?.[0] ?? "";
  const b = last?.[0] ?? "";
  return (a + b || email[0] || "?").toUpperCase();
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function ModuleChip({ name }: { name: string }) {
  return (
    <View className="rounded-full bg-slate-100 px-3 py-1">
      <Text className="text-xs font-medium text-slate-700">{name}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View className="flex-row justify-between py-2">
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text className="ml-4 flex-1 text-right text-sm font-medium text-slate-900">
        {value}
      </Text>
    </View>
  );
}

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = Number(id);
  const { user: me, hasModule, refresh } = useAuth();
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);

  const isSelf = me?.id === userId;
  const canEditProfile = isSelf || hasModule("users.edit");
  const canChangeRole = me?.role === "owner" && !isSelf;
  const canManagePerms = me?.role === "owner";

  const [modulePickerOpen, setModulePickerOpen] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [confirmRemoveGroup, setConfirmRemoveGroup] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [mutateError, setMutateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await getUser(userId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load user.");
    }
  }, [userId]);

  useEffect(() => {
    if (!Number.isInteger(userId) || userId <= 0) {
      setError("Invalid user id.");
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [userId, load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function applyUserUpdate(updated: User) {
    setData((prev) => (prev ? { ...prev, user: updated } : prev));
    if (isSelf) await refresh();
  }

  async function handleRoleSaved(updated: User) {
    await applyUserUpdate(updated);
    await load();
  }

  async function handleGrantModule(moduleName: string) {
    setMutateError(null);
    try {
      await grantUserModule(userId, moduleName);
      await load();
      if (isSelf) await refresh();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not grant module.";
      setMutateError(msg);
      throw err;
    }
  }

  async function handleRevokeModule(moduleName: string) {
    setMutating(true);
    setMutateError(null);
    try {
      await revokeUserModule(userId, moduleName);
      await load();
      if (isSelf) await refresh();
      setConfirmRevoke(null);
    } catch (err) {
      setMutateError(
        err instanceof ApiError ? err.message : "Could not revoke module.",
      );
      setConfirmRevoke(null);
    } finally {
      setMutating(false);
    }
  }

  async function handleAssignGroup(groupName: string) {
    setMutateError(null);
    try {
      await assignUserGroup(userId, groupName);
      await load();
      if (isSelf) await refresh();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not assign group.";
      setMutateError(msg);
      throw err;
    }
  }

  async function handleRemoveGroup(groupName: string) {
    setMutating(true);
    setMutateError(null);
    try {
      await removeUserGroup(userId, groupName);
      await load();
      if (isSelf) await refresh();
      setConfirmRemoveGroup(null);
    } catch (err) {
      setMutateError(
        err instanceof ApiError ? err.message : "Could not remove group.",
      );
      setConfirmRemoveGroup(null);
    } finally {
      setMutating(false);
    }
  }

  return (
    <View className="flex-1 bg-brand-50">
      <View className="flex-row items-center border-b border-slate-100 bg-white px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          className="h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
        >
          <Ionicons name="chevron-back" size={22} color="#1858b8" />
        </Pressable>
        <Text className="ml-2 flex-1 text-base font-semibold text-slate-900">
          User details
        </Text>
        {data && canChangeRole ? (
          <Pressable
            onPress={() => setRoleOpen(true)}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
          >
            <Ionicons name="shield-outline" size={20} color="#1858b8" />
          </Pressable>
        ) : null}
        {data && canEditProfile ? (
          <Pressable
            onPress={() => setEditOpen(true)}
            hitSlop={8}
            className="ml-1 h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
          >
            <Ionicons name="create-outline" size={20} color="#1858b8" />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="warning-outline" size={28} color="#dc2626" />
          <Text className="mt-2 text-center text-sm text-red-600">
            {error}
          </Text>
        </View>
      ) : data ? (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View className="items-center rounded-2xl bg-white p-6 shadow-sm">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-brand-100">
              <Text className="text-2xl font-bold text-brand-700">
                {initials(data.user.first_name, data.user.last_name, data.user.email)}
              </Text>
            </View>
            <Text className="mt-3 text-xl font-bold text-slate-900">
              {data.user.first_name} {data.user.last_name}
            </Text>
            <Text className="mt-0.5 text-sm text-slate-500">
              {data.user.email}
            </Text>
            <View
              className={`mt-3 rounded-full px-3 py-1 ${roleStyle(data.user.role).bg}`}
            >
              <Text
                className={`text-xs font-semibold uppercase tracking-wide ${roleStyle(data.user.role).fg}`}
              >
                {data.user.role}
              </Text>
            </View>
          </View>

          <View className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
            <Text className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Profile
            </Text>
            <Row label="Phone" value={data.user.phone} />
            <Row label="Address" value={data.user.address} />
            <Row label="Birth date" value={data.user.birth_date} />
            <Row label="Gender" value={data.user.gender} />
            <Row label="Created" value={formatDate(data.user.created_at)} />
            <Row label="Updated" value={formatDate(data.user.updated_at)} />
          </View>

          <View className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
            <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Effective modules
            </Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              What the server grants to this user at login.
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {data.modules.effective.length === 0 ? (
                <Text className="text-sm text-slate-500">No modules.</Text>
              ) : (
                data.modules.effective.map((m) => (
                  <ModuleChip key={m} name={m} />
                ))
              )}
            </View>
          </View>

          <View className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Groups
              </Text>
              {canManagePerms ? (
                <Pressable
                  onPress={() => setGroupPickerOpen(true)}
                  disabled={mutating}
                  hitSlop={8}
                  className="h-8 w-8 items-center justify-center rounded-full bg-brand-100 active:bg-brand-200"
                >
                  <Ionicons name="add" size={18} color="#1858b8" />
                </Pressable>
              ) : null}
            </View>
            <Text className="mt-0.5 text-xs text-slate-500">
              Each group contributes its modules to the effective set.
            </Text>
            {data.modules.groups.length === 0 ? (
              <Text className="mt-3 text-sm text-slate-500">
                Not in any group.
              </Text>
            ) : (
              <View className="mt-3 gap-3">
                {data.modules.groups.map((g) => (
                  <View
                    key={g.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-2">
                        <Text className="text-sm font-semibold text-slate-800">
                          {g.group_name}
                        </Text>
                        <Text className="text-[11px] text-slate-500">
                          joined {formatDate(g.created_at)}
                        </Text>
                      </View>
                      {canManagePerms ? (
                        <Pressable
                          onPress={() => setConfirmRemoveGroup(g.group_name)}
                          disabled={mutating}
                          hitSlop={8}
                          className="h-8 w-8 items-center justify-center rounded-full active:bg-red-50"
                        >
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color="#dc2626"
                          />
                        </Pressable>
                      ) : null}
                    </View>
                    <View className="mt-2 flex-row flex-wrap gap-2">
                      {g.modules.map((m) => (
                        <ModuleChip key={m} name={m} />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Direct grants
              </Text>
              {canManagePerms ? (
                <Pressable
                  onPress={() => setModulePickerOpen(true)}
                  disabled={mutating}
                  hitSlop={8}
                  className="h-8 w-8 items-center justify-center rounded-full bg-brand-100 active:bg-brand-200"
                >
                  <Ionicons name="add" size={18} color="#1858b8" />
                </Pressable>
              ) : null}
            </View>
            <Text className="mt-0.5 text-xs text-slate-500">
              Individual modules granted outside any group.
            </Text>
            {data.modules.direct.length === 0 ? (
              <Text className="mt-3 text-sm text-slate-500">
                No direct grants.
              </Text>
            ) : (
              <View className="mt-3 gap-2">
                {data.modules.direct.map((g) => (
                  <View
                    key={g.id}
                    className="flex-row items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <View className="flex-1 pr-2">
                      <Text className="text-sm font-medium text-slate-800">
                        {g.module_name}
                      </Text>
                      <Text className="text-[11px] text-slate-500">
                        {formatDate(g.created_at)}
                      </Text>
                    </View>
                    {canManagePerms ? (
                      <Pressable
                        onPress={() => setConfirmRevoke(g.module_name)}
                        disabled={mutating}
                        hitSlop={8}
                        className="h-8 w-8 items-center justify-center rounded-full active:bg-red-50"
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color="#dc2626"
                        />
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>

          {mutateError ? (
            <View className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
              <Text className="text-sm text-red-700">{mutateError}</Text>
            </View>
          ) : null}
        </ScrollView>
      ) : null}

      {data ? (
        <>
          <UserProfileEditModal
            visible={editOpen}
            user={data.user}
            isSelf={isSelf}
            onClose={() => setEditOpen(false)}
            onSaved={applyUserUpdate}
          />
          <RoleChangeModal
            visible={roleOpen}
            user={data.user}
            onClose={() => setRoleOpen(false)}
            onSaved={handleRoleSaved}
          />
          <ModulePickerModal
            visible={modulePickerOpen}
            excludeNames={data.modules.direct.map((d) => d.module_name)}
            onClose={() => setModulePickerOpen(false)}
            onPick={handleGrantModule}
          />
          <GroupPickerModal
            visible={groupPickerOpen}
            excludeNames={data.modules.groups.map((g) => g.group_name)}
            onClose={() => setGroupPickerOpen(false)}
            onPick={handleAssignGroup}
          />
          <ConfirmDialog
            visible={confirmRevoke !== null}
            title="Revoke module?"
            message={`This removes the direct grant "${confirmRevoke ?? ""}". If the user still has it via a group, they keep access.`}
            confirmLabel="Revoke"
            destructive
            onCancel={() => setConfirmRevoke(null)}
            onConfirm={() =>
              confirmRevoke ? handleRevokeModule(confirmRevoke) : Promise.resolve()
            }
          />
          <ConfirmDialog
            visible={confirmRemoveGroup !== null}
            title="Remove from group?"
            message={`Removes the user from "${confirmRemoveGroup ?? ""}". Direct grants are not affected.`}
            confirmLabel="Remove"
            destructive
            onCancel={() => setConfirmRemoveGroup(null)}
            onConfirm={() =>
              confirmRemoveGroup
                ? handleRemoveGroup(confirmRemoveGroup)
                : Promise.resolve()
            }
          />
        </>
      ) : null}
    </View>
  );
}
