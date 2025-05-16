import conf from "@/conf"
import useAuthContext from "@/contexts/authContext"
import useResponseHandler from "@/hooks/useResponseHandler"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom" // Changed from "react-router"
import { toast } from "sonner"
import PostCard from "@/components/PostCard" // Import PostCard

export default function Home() {
  const {toggleSignedIn, updateUser} = useAuthContext()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [errorPosts, setErrorPosts] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("omniUserToken")
    if (token) {
      // Fetch user details
      fetch(`${conf.api_url}/auth/user/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
      })
      .then((res) => useResponseHandler(res))
      .then(data => {
        if (data.invalid) {
          localStorage.removeItem("omniUserToken")
          toast("Session expired, please login again")
          navigate("/login")
          return;
        }

        updateUser(data.username)
        toggleSignedIn(true)
        // toast("Welcome back " + data.username) // Welcome toast can be shown once

        // Fetch posts after successful user auth
        setIsLoadingPosts(true)
        setErrorPosts(null)
        fetch(`${conf.api_url}/post/`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
        })
        .then((res) => useResponseHandler(res))
        .then(postData => {
          if (postData.invalid) {
            toast.error(postData.text || postData.message || "Failed to fetch posts.")
            setErrorPosts(postData.text || postData.message || "Failed to fetch posts.")
            setPosts([])
          } else {
            setPosts(Array.isArray(postData) ? postData : [])
            if (Array.isArray(postData) && postData.length === 0) {
              toast.info("No posts found.");
            }
          }
        })
        .catch(error => {
          console.error("Fetch posts error:", error)
          const errorMsg = "An error occurred while fetching posts."
          toast.error(errorMsg)
          setErrorPosts(errorMsg)
        })
        .finally(() => {
          setIsLoadingPosts(false)
        })
      })
      .catch(error => { // Catch error for user fetch
        console.error("Fetch user error:", error);
        localStorage.removeItem("omniUserToken");
        toast.error("Failed to verify session, please login again.");
        navigate("/login");
      });

    } else {
      navigate("/login")
    }
  }, []) // Added dependencies

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Your Posts</h1>
      {isLoadingPosts && <p>Loading posts...</p>}
      {errorPosts && <p className="text-red-500">Error: {errorPosts}</p>}
      {!isLoadingPosts && !errorPosts && posts.length === 0 && <p>No posts to display.</p>}
      <div className="flex flex-col items-center">
        {posts.map(post => (
          <PostCard key={(post as any).id} post={post} />
        ))}
      </div>
    </div>
  )
}
