import api from "./api.js";

function getApiMessage(response, fallback) {
  if (response?.data?.message) return response.data.message;
  return fallback;
}

export function getRequestErrorMessage(error) {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response) {
    return `The server could not complete your request (HTTP ${error.response.status}). Please try again.`;
  }
  if (error.request) {
    return "Could not reach the server. Check that the backend is running and try again.";
  }
  return error.message || "Something went wrong. Please try again.";
}

export async function getArtists(filters = {}, signal) {
  const params = {
    page: filters.page || 1,
    limit: filters.limit || 12,
  };

  for (const field of ["name", "skill", "location"]) {
    if (filters[field]?.trim()) params[field] = filters[field].trim();
  }

  const response = await api.get("/artists", { params, signal });
  const result = response.data;

  if (
    result.success !== true ||
    !Array.isArray(result.data?.artists) ||
    !result.data?.pagination
  ) {
    throw new Error(getApiMessage(result, "The server returned an unexpected artist list."));
  }

  return result.data;
}

export async function getArtistById(id, signal) {
  const response = await api.get(`/artists/${encodeURIComponent(id)}`, { signal });
  const result = response.data;

  if (result.success !== true || !result.data?.artist) {
    throw new Error(getApiMessage(result, "The server returned an unexpected artist profile."));
  }

  return result.data.artist;
}

export async function getArtistPortfolio(artistId, signal) {
  const firstPage = await getPortfolioPage(artistId, 1, signal);
  const portfolios = [...firstPage.portfolios];
  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    const result = await getPortfolioPage(artistId, page, signal);
    portfolios.push(...result.portfolios);
  }
  return portfolios;
}

async function getPortfolioPage(artistId, page, signal) {
  const response = await api.get("/portfolio", {
    params: { artistId, page, limit: 100 },
    signal,
  });
  const result = response.data;

  if (
    result.success !== true ||
    !Array.isArray(result.data?.portfolios) ||
    !result.data?.pagination
  ) {
    throw new Error(getApiMessage(result, "The server returned an unexpected portfolio list."));
  }

  return result.data;
}

export async function getOwnArtistProfile(name, userId, signal) {
  const response = await api.get("/artists", {
    params: { name, page: 1, limit: 100 },
    signal,
  });
  const result = response.data;

  if (result.success !== true || !Array.isArray(result.data?.artists)) {
    throw new Error(getApiMessage(result, "The server returned an unexpected artist list."));
  }

  return result.data.artists.find((artist) => String(artist.user?._id) === String(userId)) || null;
}

export async function saveOwnArtistProfile(profile) {
  const response = await api.post("/artists/profile", profile);
  if (response.data.success !== true || !response.data.data?.artist) {
    throw new Error(getApiMessage(response, "The artist profile could not be created."));
  }
  return response.data.data.artist;
}

export async function updateOwnArtistProfile(profile) {
  const response = await api.put("/artists/profile", profile);
  if (response.data.success !== true || !response.data.data?.artist) {
    throw new Error(getApiMessage(response, "The artist profile could not be updated."));
  }
  return response.data.data.artist;
}

export async function getSavedArtists() {
  const response = await api.get("/saved-artists");
  const result = response.data;

  if (result.success !== true || !Array.isArray(result.data?.savedArtists)) {
    throw new Error(getApiMessage(result, "The server returned an unexpected saved artists list."));
  }

  return result.data.savedArtists;
}

export async function saveArtist(artistUserId) {
  const response = await api.post(`/saved-artists/${encodeURIComponent(artistUserId)}`);
  if (response.data.success !== true) {
    throw new Error(getApiMessage(response, "The artist could not be saved."));
  }
  return response.data;
}

export async function removeSavedArtist(artistUserId) {
  const response = await api.delete(`/saved-artists/${encodeURIComponent(artistUserId)}`);
  if (response.data.success !== true) {
    throw new Error(getApiMessage(response, "The artist could not be removed from your saved list."));
  }
  return response.data;
}

export async function sendArtistMessage(receiverId, content) {
  const response = await api.post(
    `/messages/${encodeURIComponent(receiverId)}`,
    { content },
  );
  if (response.data.success !== true || !response.data.data?.message) {
    throw new Error(getApiMessage(response, "The message could not be sent."));
  }
  return response.data.data.message;
}

export async function getConversation(userId, signal) {
  const response = await api.get(`/messages/${encodeURIComponent(userId)}`, { signal });
  const result = response.data;
  if (result.success !== true || !Array.isArray(result.data?.messages)) {
    throw new Error(getApiMessage(result, "The server returned an unexpected conversation."));
  }
  return result.data.messages;
}

export async function getMessageConversations(signal) {
  const response = await api.get("/messages", { signal });
  const result = response.data;
  if (result.success !== true || !Array.isArray(result.data?.conversations)) {
    throw new Error(getApiMessage(result, "The server returned an unexpected conversation list."));
  }
  return result.data.conversations;
}

export async function getProjectById(projectId, signal) {
  const response = await api.get(`/projects/${encodeURIComponent(projectId)}`, { signal });
  const result = response.data;
  if (result.success !== true || !result.data?.project) {
    throw new Error(getApiMessage(result, "The server returned an unexpected project."));
  }
  return result.data.project;
}

export async function getOpenProjects({ page = 1, limit = 100, skill } = {}, signal) {
  const params = { page, limit };
  if (skill?.trim()) params.skill = skill.trim();
  const response = await api.get("/projects", { params, signal });
  const result = response.data;
  if (result.success !== true || !Array.isArray(result.data?.projects) || !result.data?.pagination) {
    throw new Error(getApiMessage(result, "The server returned an unexpected project list."));
  }
  return result.data;
}

export async function getAllOpenProjects(signal) {
  const firstPage = await getOpenProjects({ page: 1, limit: 100 }, signal);
  const projects = [...firstPage.projects];

  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    const result = await getOpenProjects({ page, limit: 100 }, signal);
    projects.push(...result.projects);
  }

  return projects;
}

export async function getAllMyProjects(signal) {
  const firstPage = await api.get("/projects/mine", {
    params: { page: 1, limit: 100 },
    signal,
  });
  const firstResult = firstPage.data;
  if (
    firstResult.success !== true ||
    !Array.isArray(firstResult.data?.projects) ||
    !firstResult.data?.pagination
  ) {
    throw new Error(getApiMessage(firstResult, "The server returned an unexpected studio project list."));
  }

  const projects = [...firstResult.data.projects];
  for (let page = 2; page <= firstResult.data.pagination.totalPages; page += 1) {
    const response = await api.get("/projects/mine", {
      params: { page, limit: 100 },
      signal,
    });
    const result = response.data;
    if (result.success !== true || !Array.isArray(result.data?.projects)) {
      throw new Error(getApiMessage(result, "The server returned an unexpected studio project list."));
    }
    projects.push(...result.data.projects);
  }

  return projects;
}

export async function getAllArtists(signal) {
  const firstPage = await getArtists({ page: 1, limit: 100 }, signal);
  const artists = [...firstPage.artists];

  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    const result = await getArtists({ page, limit: 100 }, signal);
    artists.push(...result.artists);
  }

  return artists;
}

export async function createProject(project) {
  const response = await api.post("/projects", project);
  if (response.data.success !== true || !response.data.data?.project) {
    throw new Error(getApiMessage(response, "The project could not be created."));
  }
  return response.data.data.project;
}

export async function updateProject(projectId, project) {
  const response = await api.put(`/projects/${encodeURIComponent(projectId)}`, project);
  if (response.data.success !== true || !response.data.data?.project) {
    throw new Error(getApiMessage(response, "The project could not be updated."));
  }
  return response.data.data.project;
}

export async function deleteProject(projectId) {
  const response = await api.delete(`/projects/${encodeURIComponent(projectId)}`);
  if (response.data.success !== true) {
    throw new Error(getApiMessage(response, "The project could not be deleted."));
  }
  return response.data;
}

export async function createPortfolioItem(item) {
  const response = await api.post("/portfolio", item);
  if (response.data.success !== true || !response.data.data?.portfolio) {
    throw new Error(getApiMessage(response, "The artwork could not be created."));
  }
  return response.data.data.portfolio;
}

export async function updatePortfolioItem(itemId, item) {
  const response = await api.put(`/portfolio/${encodeURIComponent(itemId)}`, item);
  if (response.data.success !== true || !response.data.data?.portfolio) {
    throw new Error(getApiMessage(response, "The artwork could not be updated."));
  }
  return response.data.data.portfolio;
}

export async function deletePortfolioItem(itemId) {
  const response = await api.delete(`/portfolio/${encodeURIComponent(itemId)}`);
  if (response.data.success !== true) {
    throw new Error(getApiMessage(response, "The artwork could not be deleted."));
  }
  return response.data;
}
