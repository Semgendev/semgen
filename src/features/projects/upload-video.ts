import { Upload } from "tus-js-client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

const CHUNK_SIZE = 6 * 1024 * 1024;

export type UploadHandle = { promise: Promise<void>; abort: () => void };

type UploadVideoInput = {
  file: File;
  projectId: string;
  extension: string;
  contentType: string;
  onProgress: (percent: number) => void;
};

// Resumable (TUS) upload straight from the browser to the private `videos` bucket.
export async function uploadVideo(input: UploadVideoInput): Promise<UploadHandle> {
  const env = getSupabasePublicEnv();
  if (!env) throw new Error("Supabase is not configured");

  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) throw new Error("not_authenticated");

  let upload: Upload | undefined;
  const promise = new Promise<void>((resolve, reject) => {
    upload = new Upload(input.file, {
      endpoint: `${env.url}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        apikey: env.publishableKey,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: CHUNK_SIZE,
      metadata: {
        bucketName: "videos",
        objectName: `${session.user.id}/${input.projectId}/source.${input.extension}`,
        contentType: input.contentType,
        cacheControl: "3600",
      },
      onProgress: (uploaded, total) => input.onProgress(Math.round((uploaded / total) * 100)),
      onError: reject,
      onSuccess: () => resolve(),
    });

    void upload.findPreviousUploads().then((previous) => {
      const resumable = previous[0];
      if (resumable) upload?.resumeFromPreviousUpload(resumable);
      upload?.start();
    });
  });

  return { promise, abort: () => void upload?.abort(true) };
}

export function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const finish = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () => finish(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => finish(null);
    video.src = url;
  });
}
