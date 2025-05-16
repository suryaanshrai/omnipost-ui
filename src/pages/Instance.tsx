import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import conf from '@/conf'
import useResponseHandler from '@/hooks/useResponseHandler'
import { useEffect, useState } from 'react'
import { FaInstagram, FaFacebook, FaLinkedin } from 'react-icons/fa'
import { toast } from 'sonner'

function Instance() {
  const [access_token, setAccessToken] = useState("")
  const [instagram_id, setInstagramId] = useState("")
  const [instanceName, setInstanceName] = useState("")
  const [linkedinUrn, setLinkedUrn] = useState("")
  const [facebookId, setFacebookId] = useState("")
  const [password, setPassword] = useState("")
  const [instances, setInstances] = useState<{ platform_name: string; instance_name: string }[]>([])

  useEffect(() => {
    fetch(`${conf.api_url}/platform_instance/`, {
      headers: {
        "Authorization": `Token ${localStorage.getItem("omniUserToken")}`,
      },
    })
      .then(res => res.json())
      .then(data => setInstances(data))
      .catch(() => setInstances([]))
  }, [])

  const handleSubmitInsta = (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (!access_token || !instagram_id) {
      toast.error("Please enter all the details")
      return
    }
    fetch(`${conf.api_url}/platform_instance/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${localStorage.getItem("omniUserToken")}`,
      },
      body: JSON.stringify({credentials:{ ACCESS_TOKEN: access_token, IG_ID: instagram_id }, platform_id:1, password:password, instance_name:instanceName}),
    })
    .then((res) => useResponseHandler(res))
    .then((data) => {
      if (data.invalid) {
        toast.error(data.text)
        return
      }
      toast.success("Instagram Instance Created Successfully")
      setAccessToken("")
      setInstagramId("")
      setInstanceName("")
      setPassword("")
    })
  }



  const handleSubmitFB = (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (!access_token || !facebookId) {
      toast.error("Please enter all the details")
      return
    }
    fetch(`${conf.api_url}/platform_instance/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${localStorage.getItem("omniUserToken")}`,
      },
      body: JSON.stringify({credentials:{ ACCESS_TOKEN: access_token, PAGE_ID: facebookId }, platform_id:3, password:password, instance_name:instanceName}),
    })
    .then((res) => useResponseHandler(res))
    .then((data) => {
      if (data.invalid) {
        toast.error(data.text)
        return
      }
      toast.success("Facebook Instance Added Successfully")
      setAccessToken("")
      setFacebookId("")
      setInstanceName("")
      setPassword("")
    })
  }

  const handleSubmitLI = (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (!access_token || !linkedinUrn) {
      toast.error("Please enter all the details")
      return
    }
    fetch(`${conf.api_url}/platform_instance/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${localStorage.getItem("omniUserToken")}`,
      },
      body: JSON.stringify({credentials:{ ACCESS_TOKEN: access_token, AUTHOR_URN: linkedinUrn }, platform_id:2, password:password, instance_name:instanceName}),
    })
    .then((res) => useResponseHandler(res))
    .then((data) => {
      if (data.invalid) {
        toast.error(data.text)
        return
      }
      toast.success("LinkedIn Instance Created Successfully")
      setAccessToken("")
      setFacebookId("")
      setInstanceName("")
      setPassword("")
    })
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return <FaInstagram className="inline mr-2 text-pink-500" />
      case 'facebook':
        return <FaFacebook className="inline mr-2 text-blue-600" />
      case 'linkedin':
        return <FaLinkedin className="inline mr-2 text-blue-400" />
      default:
        return null
    }
  }

  return (
    <div className='w-full text-center'style={{marginBottom:"500px"}}>
      Connect to Any of the following Platforms
      <div>
      <AlertDialog>
  <AlertDialogTrigger  className='m-5 p-5 text-xl'><FaInstagram /> Instagram</AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Give the following details</AlertDialogTitle>
      <AlertDialogDescription>
        <form onSubmit={handleSubmitInsta}>
          <input required type='text' placeholder='Access Token' onChange={(e) => {setAccessToken(e.target.value)}} className='w-full h-8 m-1'/>
          <input required type='text' placeholder='Instagram ID' onChange={(e) => {setInstagramId(e.target.value)}} className='w-full h-8 m-1'/>
          <input type='text' placeholder='Instance Name' onChange={(e) => {setInstanceName(e.target.value)}} className='w-full h-8 m-1'/>
          <input type='password' placeholder='Password' onChange={(e) => {setPassword(e.target.value)}} className='w-full h-8 m-1'/>
          <Button type="submit" className='mt-2 w-full'>Submit</Button>
        </form>
      </AlertDialogDescription>
      <AlertDialogCancel>Close</AlertDialogCancel>
    </AlertDialogHeader>
  </AlertDialogContent>
</AlertDialog>
      




<AlertDialog>
  <AlertDialogTrigger className='m-5 p-5 text-xl'><FaFacebook/> Facebook</AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Give the following details</AlertDialogTitle>
      <AlertDialogDescription>
        <form onSubmit={handleSubmitFB}>
          <input required type='text' placeholder='Access Token' onChange={(e) => {setAccessToken(e.target.value)}} className='w-full h-8 m-1'/>
          <input required type='text' placeholder='Page ID' onChange={(e) => {setFacebookId(e.target.value)}} className='w-full h-8 m-1'/>
          <input type='text' placeholder='Instance Name' onChange={(e) => {setInstanceName(e.target.value)}} className='w-full h-8 m-1'/>
          <input type='password' placeholder='Password' onChange={(e) => {setPassword(e.target.value)}} className='w-full h-8 m-1'/>
          <Button type="submit" className='mt-2 w-full'>Submit</Button>
        </form>
      </AlertDialogDescription>
      <AlertDialogCancel>Close</AlertDialogCancel>
    </AlertDialogHeader>
  </AlertDialogContent>
</AlertDialog>


<AlertDialog>
  <AlertDialogTrigger  className='m-5 p-5 text-xl'>      <FaLinkedin/> LinkedIn
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Give the following details</AlertDialogTitle>
      <AlertDialogDescription>
        <form onSubmit={handleSubmitLI}>
          <input required type='text' placeholder='Access Token' onChange={(e) => {setAccessToken(e.target.value)}} className='w-full h-8 m-1'/>
          <input required type='text' placeholder='Author URN' onChange={(e) => {setLinkedUrn(e.target.value)}} className='w-full h-8 m-1'/>
          <input type='text' placeholder='Instance Name' onChange={(e) => {setInstanceName(e.target.value)}} className='w-full h-8 m-1'/>
          <input type='password' placeholder='Password' onChange={(e) => {setPassword(e.target.value)}} className='w-full h-8 m-1'/>
          <Button type="submit" className='mt-2 w-full'>Submit</Button>
        </form>
      </AlertDialogDescription>
      <AlertDialogCancel>Close</AlertDialogCancel>
    </AlertDialogHeader>
  </AlertDialogContent>
</AlertDialog>

      </div>
      <hr className='w-full' />
      <h2 className='mt-5'>Your Instances</h2>
      <div className="flex flex-col items-center gap-2 mt-4">
        {!instances && <span className="text-gray-400">No instances found.</span>}
        {instances.map((inst, idx) => (
          <div key={idx} className="flex items-center border rounded px-4 py-2 w-full max-w-md bg-zinc-900">
            {getPlatformIcon(inst.platform)}
            <span className="font-medium">{inst.instance_name}</span>
          </div>
        ))}
      </div>
    </div>)
}

export default Instance