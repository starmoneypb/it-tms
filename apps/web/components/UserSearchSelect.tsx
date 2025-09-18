"use client";

import { useState, useEffect, useCallback } from "react";
import { Select, SelectItem, Avatar, Chip } from "@heroui/react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  profilePicture?: string;
}

interface UserSearchSelectProps {
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
  placeholder?: string;
  label?: string;
  variant?: "flat" | "bordered" | "faded" | "underlined";
  isMultiple?: boolean;
  isDisabled?: boolean;
  excludeUserIds?: string[];
  allowClear?: boolean;
}

const DEFAULT_EXCLUDE_USER_IDS: string[] = [];

export default function UserSearchSelect({
  selectedUserIds,
  onSelectionChange,
  placeholder = "Search and select users...",
  label,
  variant = "flat",
  isMultiple = true,
  isDisabled = false,
  excludeUserIds = DEFAULT_EXCLUDE_USER_IDS,
  allowClear = true,
}: UserSearchSelectProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputValue, setInputValue] = useState("");

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setSearchQuery(query);
    }, 300),
    []
  );

  // Update search query with debounce when input changes
  useEffect(() => {
    debouncedSearch(inputValue);
  }, [inputValue, debouncedSearch]);

  // Fetch users based on search query
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) {
          params.set("q", searchQuery.trim());
        }
        
        const response = await fetch(`${API}/api/v1/users/search?${params}`, {
          credentials: "include",
        });
        
        if (response.ok) {
          const data = await response.json();
          // Filter out excluded users
          const filteredUsers = data.data.filter((user: User) => 
            !excludeUserIds.includes(user.id)
          );
          
          // Add clear option if allowClear is enabled and not multiple selection
          const usersWithClearOption = allowClear && !isMultiple 
            ? [{ id: "", name: "Any assignee", email: "", role: "", profilePicture: undefined }, ...filteredUsers]
            : filteredUsers;
          
          setUsers(usersWithClearOption);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [searchQuery, excludeUserIds.join(','), allowClear, isMultiple]);

  const handleSelectionChange = (keys: any) => {
    if (keys === "all") {
      onSelectionChange(users.map(user => user.id));
    } else {
      const selectedIds = Array.from(keys) as string[];
      onSelectionChange(selectedIds);
    }
  };

  const getRoleColor = (role: string | undefined): "default" | "primary" | "secondary" | "success" | "warning" | "danger" => {
    switch (role) {
      case "Manager": return "primary";
      case "Supervisor": return "secondary";
      case "User": return "default";
      default: return "default";
    }
  };

  return (
    <div className="w-full">
      <Select
        items={users}
        label={label}
        placeholder={placeholder}
        variant={variant}
        isLoading={loading}
        selectionMode={isMultiple ? "multiple" : "single"}
        selectedKeys={new Set(selectedUserIds)}
        onSelectionChange={handleSelectionChange}
        isDisabled={isDisabled}
        className="w-full"
        classNames={variant === "bordered" ? {} : {
          trigger: "glass border-white/20",
          popoverContent: "glass",
          listbox: "text-white",
        }}
        renderValue={(items) => {
          if (!isMultiple && items.length === 1) {
            const item = Array.from(items)[0];
            return item.data?.name || placeholder;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {items.map((item) => (
                <Chip
                  key={item.key}
                  size="sm"
                  color={getRoleColor(item.data?.role)}
                  variant="flat"
                  avatar={
                    item.data?.profilePicture ? (
                      <Avatar
                        alt={item.data.name}
                        className="w-4 h-4"
                        src={`${API}${item.data.profilePicture}`}
                      />
                    ) : undefined
                  }
                >
                  {item.data?.name}
                </Chip>
              ))}
            </div>
          );
        }}
      >
        {(user) => (
          <SelectItem
            key={user.id}
            textValue={user.name}
            className="text-white"
          >
            {user.id === "" ? (
              // Special rendering for "Any assignee" option
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center">
                  <span className="text-white text-xs">?</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs text-white/60">Clear filter</span>
                </div>
              </div>
            ) : (
              // Normal user rendering
              <div className="flex items-center gap-3">
                <Avatar
                  alt={user.name}
                  className="w-8 h-8"
                  src={user.profilePicture ? `${API}${user.profilePicture}` : undefined}
                  name={user.name.charAt(0).toUpperCase()}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs text-white/60">{user.email}</span>
                </div>
                <Chip
                  size="sm"
                  color={getRoleColor(user.role)}
                  variant="flat"
                  className="ml-auto"
                >
                  {user.role}
                </Chip>
              </div>
            )}
          </SelectItem>
        )}
      </Select>
    </div>
  );
}
