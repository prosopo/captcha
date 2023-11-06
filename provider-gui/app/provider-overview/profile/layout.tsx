import ProfileBreadcrumb from '@/components/ProfileBreadcrumb'
import Spacer from '@/components/Spacer'

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
    return (
        <div>
            <ProfileBreadcrumb />
            <Spacer height={10} />
            {children}
        </div>
    )
}
