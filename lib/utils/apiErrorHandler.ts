/**
 * Handles API errors and returns user-friendly error messages
 */
export async function handleApiError(response: Response): Promise<string> {
  // Try to parse error message from response body
  let errorMessage = "An unexpected error occurred. Please try again.";

  try {
    const data = await response.json();
    if (data.error) {
      errorMessage = data.error;
    }
  } catch {
    // If JSON parsing fails, use status-based messages
  }

  // Provide specific messages for common status codes
  switch (response.status) {
    case 401:
      return "You are not signed in. Please sign in to continue.";
    case 403:
      return "You don't have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    case 500:
      return "Server error occurred. Please try again later.";
    case 503:
      return "Service temporarily unavailable. Please try again later.";
    default:
      return errorMessage;
  }
}

/**
 * Wrapper for fetch requests with better error handling
 */
export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorMessage = await handleApiError(response);
      throw new Error(errorMessage);
    }

    return response;
  } catch (error) {
    // Network errors or other exceptions
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error("Network error. Please check your connection and try again.");
    }
    throw error;
  }
}
