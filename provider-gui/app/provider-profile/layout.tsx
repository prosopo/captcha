import ProfileBreadcrumb from '@/components/profile-breadcrumb'
import Spacer from '@/components/spacer'

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
    return (
        <div>
            <ProfileBreadcrumb />
            <Spacer height={10} />
            {children}
        </div>
    )
}
