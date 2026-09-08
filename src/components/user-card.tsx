
import { UserCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import useAuthContext from '@/contexts/authContext';

interface UserCardProps {
  className?: string;
  date?: string;
}

function UserCard({ className, date="" }: UserCardProps) {
  const {user} = useAuthContext()
  return (
    <div className={`${className} inline-block`}>

    <div className='flex rounded-md'>
    <Avatar className='mr-3 mt-1'>
      <AvatarFallback><UserCircle /></AvatarFallback>
    </Avatar>
        <div>
            <div className='mb-1'>
              {user}
                
            </div>
            <div className='text-sm'>
                {date}
            </div>
        </div>
    </div>
    </div>
  )
}

export default UserCard