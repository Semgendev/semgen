"use client";

import { Pencil, Trash2 } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/routing";

import { deleteProjectAction, renameProjectAction } from "./actions";

type ProjectActionsProps = { projectId: string; title: string };

export function ProjectActions({ projectId, title }: ProjectActionsProps) {
  const t = useTranslations("projects");
  const router = useRouter();
  const [name, setName] = useState(title);
  const [renaming, setRenaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function saveName() {
    setError(null);
    startTransition(async () => {
      const result = await renameProjectAction(projectId, name);
      if (result.ok) {
        setRenaming(false);
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
      if (result.ok) router.replace("/projects");
      else setError(t("errors.unknown"));
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {renaming ? (
        <div className="flex gap-2">
          <Input
            value={name}
            maxLength={120}
            aria-label={t("titleLabel")}
            onChange={(event) => setName(event.target.value)}
          />
          <Button onClick={saveName} disabled={pending || name.trim() === ""}>
            {t("save")}
          </Button>
          <Button variant="ghost" onClick={() => setRenaming(false)} disabled={pending}>
            {t("cancel")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setRenaming(true)}>
            <Pencil className="size-4" />
            {t("rename")}
          </Button>
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>
              <Trash2 className="size-4" />
              {t("delete")}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("deleteTitle")}</DialogTitle>
                <DialogDescription>{t("deleteBody", { title })}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>{t("cancel")}</DialogClose>
                <Button variant="destructive" onClick={remove} disabled={pending}>
                  {t("deleteConfirm")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
