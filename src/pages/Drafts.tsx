import React, { useEffect, useState } from 'react';
import conf from '@/conf';
import useResponseHandler from '@/hooks/useResponseHandler';
import { toast } from 'sonner';
import DraftCard from '@/components/DraftCard'; // Adjust path if needed
import { Loader2 } from 'lucide-react';

// You can move this interface to a central types file if you prefer
// export interface PostConfigDetail {
//   CAPTION?: string;
//   IMAGE_URL?: string;
//   TEXT?: string;
//   VIDEO_URL?: string;
// }

// export interface PostConfigs {
//   Facebook: PostConfigDetail;
//   LinkedIn: PostConfigDetail;
//   Instagram: PostConfigDetail;
// }

// export interface Draft {
//   id: number;
//   user_id: number;
//   created_at: string;
//   post_configs: PostConfigs;
//   schedule: string | null;
//   published: boolean;
//   caption?: string;
//   text?: string;
//   image?: string;
//   image_url?: string;
//   video?: string; // Add if your API returns this for video posts
//   video_url?: string; // Add if your API returns this for video posts
//   post_type: "IMAGE" | "TEXT" | "VIDEO"; // Add "VIDEO" if applicable
// }

function Drafts() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrafts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${conf.api_url}/drafts/`, {
        method: "GET",
        headers: {
          "Authorization": `Token ${localStorage.getItem("omniUserToken")}`,
        },
      });
      const data = await useResponseHandler(response);

      if (data.invalid || !response.ok) {
        toast.error(data.text || data.message || "Failed to fetch drafts.");
        setError(data.text || data.message || "Failed to fetch drafts.");
        setDrafts([]);
      } else {
        setDrafts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Fetch drafts error:", err);
      toast.error("An error occurred while fetching drafts.");
      setError("An error occurred. Please try again.");
      setDrafts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const handlePublishSuccess = (publishedDraftId: number) => {
    // Remove the published draft from the list or refetch
    setDrafts(prevDrafts => prevDrafts.filter(draft => draft.id !== publishedDraftId));
    // Or, for a full refresh:
    // fetchDrafts(); 
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-pink-500" />
        <p className="ml-4 text-lg">Loading drafts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 px-4 text-center">
        <p className="text-red-500 text-xl mb-4">{error}</p>
        <button 
          onClick={fetchDrafts} 
          className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-4 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Your Drafts</h1>
      {drafts.length === 0 ? (
        <p className="text-center text-muted-foreground text-lg">You have no drafts yet.</p>
      ) : (
        <div className="flex flex-col items-center gap-6">
          {drafts.map((draft) => (
            <DraftCard key={draft.id} draft={draft} onPublishSuccess={handlePublishSuccess} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Drafts;