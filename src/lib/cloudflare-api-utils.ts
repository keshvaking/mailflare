import type { CfApiError, CfAuth } from "@/lib/cloudflare-api.types";

function cleanToken(raw?: string): string | undefined {
	if (!raw) return undefined;
	const trimmed = raw.trim().replace(/^["']|["']$/g, "");
	const tokenMatch = trimmed.match(/cf[ua]t_[A-Za-z0-9_-]+/i);
	if (tokenMatch) {
		return tokenMatch[0];
	}
	const stripped = trimmed.replace(/^Bearer\s+/i, "").replace(/\s+/g, "").trim();
	return stripped || undefined;
}

export function getCloudflareAuth(env: CloudflareEnv): CfAuth {
	const token = cleanToken(env.CF_TOKEN);
	const apiKeyCandidate = cleanToken(env.CF_API_KEY);
	const email = env.CF_EMAIL?.trim().replace(/^["']|["']$/g, "");

	if (token) {
		return { kind: "token", token };
	}

	if (apiKeyCandidate && /^cf[ua]t_/i.test(apiKeyCandidate)) {
		return { kind: "token", token: apiKeyCandidate };
	}

	if (apiKeyCandidate && email) {
		return { kind: "global-key", email, key: apiKeyCandidate };
	}

	if (apiKeyCandidate && !email) {
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
			const chain = error.error_chain?.length
				? ` [${error.error_chain.map((c) => `${c.code ? `code ${c.code}: ` : ""}${c.message}`).join("; ")}]`
				: "";
			return `${code}${error.message}${chain}`;
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
