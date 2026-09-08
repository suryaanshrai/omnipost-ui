import { useEffect, useState } from 'react';
import conf from '@/conf';
import handleApiResponse from '@/lib/handle-api-response';
import { toast } from 'sonner';
import DraftCard from '@/components/DraftCard';
import { Loader2 } from 'lucide-react';
import type { Draft } from '@/types';

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
      const data = await handleApiResponse(response);

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