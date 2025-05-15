import { toast } from "sonner";

export default function useResponseHandler(response: { ok: any; json: () => Promise<any>; }) {
    if (!response.ok) {
        return response.json().then(errorData => {
          const errors = Object.entries(errorData).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join('\n');
          toast(`Error:\n${errors}`);
          return {invalid:true};
        });
      }
      return response.json();
    }