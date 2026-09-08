import { toast } from "sonner";

// Was previously named `useResponseHandler` and lived under hooks/, which made
// every call site (`.then(res => useResponseHandler(res))`, inside plain async
// functions and callbacks) trip eslint's react-hooks/rules-of-hooks — it is a
// plain function, not a hook, and never was one.
// The response shape is genuinely dynamic here — there's no generated client
// yet (see the revamp roadmap), so every call site does its own ad-hoc
// property access on whatever the API returns. `any` is the honest type
// until that lands; typing this `unknown` would just push silent `as any`
// casts into ~10 call sites instead of one.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function handleApiResponse(response: { ok: boolean; json: () => Promise<any> }) {
  if (!response.ok) {
    return response.json().then((errorData) => {
      const errors = Object.entries(errorData)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
        .join("\n");
      toast(`Error:\n${errors}`);
      return { invalid: true };
    });
  }
  return response.json();
}
