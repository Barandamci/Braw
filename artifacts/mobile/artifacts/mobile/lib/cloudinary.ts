const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = "braw_uploads";

export async function uploadMedia(
  uri: string,
  resourceType: "image" | "video" = "image"
): Promise<string> {
  const formData = new FormData();

  const filename = uri.split("/").pop() || "upload";
  const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
  const mimeType =
    resourceType === "video"
      ? `video/${ext}`
      : `image/${ext === "jpg" ? "jpeg" : ext}`;

  formData.append("file", {
    uri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("resource_type", resourceType);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error("Upload failed");
  }

  const data = await response.json();
  return data.secure_url as string;
}
