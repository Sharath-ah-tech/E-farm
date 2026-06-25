const API_ORIGIN = "http://127.0.0.1:8000";

export const getMediaUrl = (path) => {
  if (!path) {
    return "/vite.svg";
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (path.startsWith("/media/")) {
    return `${API_ORIGIN}${path}`;
  }

  if (path.startsWith("media/")) {
    return `${API_ORIGIN}/${path}`;
  }

  return `${API_ORIGIN}/media/${path}`;
};
