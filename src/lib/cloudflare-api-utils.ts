import type { CfApiError, CfAuth } from "@/lib/cloudflare-api.types";

export function getCloudflareAuth(env: CloudflareEnv): CfAuth {
	const rawToken = env.CF_TOKEN?.trim().replace(/^["']|["']$/g, "");
	const token = rawToken?.replace(/^Bearer\s+/i, "").trim();
	const key = env.CF_API_KEY?.trim().replace(/^["']|["']$/g, "");
	const email = env.CF_EMAIL?.trim().replace(/^["']|["']$/g, "");

	if (key && email) {
		return { kind: "global-key", email, key };
	}

	if (token) {
		return { kind: "token", token };
	}

	if (key && !email) {
		throw new Error("CF_EMAIL is required when using CF_API_KEY");
	}

	throw new Error("CF_TOKEN or CF_API_KEY is not configured");
}

export function getCloudflareAuthHeaders(auth: CfAuth): HeadersInit {
	if (auth.kind === "global-key") {
		return {
			"X-Auth-Email": auth.email,
			"X-Auth-Key": auth.key,
		};
	}

	return {
		Authorization: `Bearer ${auth.token}`,
	};
}

export function formatCloudflareError(path: string, status: number, statusText: string, errors: CfApiError[]) {
	const details = errors
		.map((error) => {
			const code = error.code ? `code ${error.code}: ` : "";
			return `${code}${error.message}`;
		})
		.join("; ");
	const message = details || statusText || "Cloudflare API request failed";

	return `Cloudflare API ${status} on ${path}: ${message}`;
}

export function getCloudflareAuthHint(errors: CfApiError[]) {
	const hasAuthError = errors.some(
		(error) =>
			error.code === 10000 ||
			error.code === 9109 ||
			error.code === 6003 ||
			/auth/i.test(error.message) ||
			/token/i.test(error.message) ||
			/headers/i.test(error.message),
	);
	if (!hasAuthError) return "";

	return " Verify CF_TOKEN: ensure it contains only the token secret value (without 'Bearer ' prefix, Token ID, or quotes), or use CF_API_KEY plus CF_EMAIL for a Global API Key.";
}

export function getEmailWorkerName(): string {
	return "mailflare";
}
