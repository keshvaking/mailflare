import type { AttachmentContent } from "@/lib/email/attachment-types";

export type ResendSendOptions = {
	apiKey: string;
	from: string;
	to: string;
	subject: string;
	html?: string;
	text?: string;
	headers?: Record<string, string>;
	attachments?: AttachmentContent[];
};

export async function sendViaResend(options: ResendSendOptions): Promise<{ messageId: string }> {
	const body: Record<string, unknown> = {
		from: options.from,
		to: [options.to],
		subject: options.subject,
	};

	if (options.html) body.html = options.html;
	if (options.text) body.text = options.text;
	if (options.headers) body.headers = options.headers;

	if (options.attachments?.length) {
		body.attachments = options.attachments.map((a) => ({
			filename: a.filename,
			content: Buffer.from(a.content).toString("base64"),
		}));
	}

	const res = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${options.apiKey.trim()}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	const data = (await res.json()) as { id?: string; message?: string; name?: string };

	if (!res.ok || !data.id) {
		throw new Error(data.message || "Failed to send email via Resend API");
	}

	return { messageId: data.id };
}
