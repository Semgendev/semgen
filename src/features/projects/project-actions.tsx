"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/routing";
import { cn } from "@/lib/utils";

import { deleteProjectAction, renameProjectAction } from "./actions";

type ProjectMenuProps = {
  projectId: string;
  title: string;
  // "list": go back to the projects list after a deletion (project page); "refresh": stay (list page)
  afterDelete: "list" | "refresh";
  // when given, "Rename" calls it (inline editing of the title) instead of opening a dialog
  onRename?: () => void;
  className?: string;
};

// The "⋯" menu of a project: Rename and Delete (no Duplicate: it would copy the video file).
export function ProjectMenu({
  projectId,
  title,
  afterDelete,
  onRename,
  className,
}: ProjectMenuProps) {
  const t = useTranslations("projects");
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function saveName() {
    setError(null);
    startTransition(async () => {
      const result = await renameProjectAction(projectId, name);
      if (result.ok) {
        setRenameOpen(false);
        router.refresh();
      } else {
        setError(t("errors.unknown"));
      }
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteProjectAction(projectId);
      if (!result.ok) {
        setError(t("errors.unknown"));
        return;
      }
      setDeleteOpen(false);
      if (afterDelete === "list") router.replace("/projects");
      else router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("menu")}
              className={cn("size-8", className)}
            />
          }
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              if (onRename) onRename();
              else {
                setName(title);
                setError(null);
                setRenameOpen(true);
              }
            }}
          >
            <Pencil className="size-4" aria-hidden="true" />
            {t("rename")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              setError(null);
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rename")}</DialogTitle>
          </DialogHeader>
          <Input
            value={name}
            maxLength={120}
            aria-label={t("titleLabel")}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && name.trim() !== "") saveName();
            }}
          />
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t("cancel")}</DialogClose>
            <Button onClick={saveName} disabled={pending || name.trim() === ""}>
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
            <DialogDescription>{t("deleteBody", { title })}</DialogDescription>
          </DialogHeader>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t("cancel")}</DialogClose>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              {t("deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
