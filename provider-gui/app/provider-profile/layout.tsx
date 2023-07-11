import ProfileBreadcrumb from '@/components/profile-breadcrumb'

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
    return (
        <div>
            <ProfileBreadcrumb />
            {children}
        </div>
    )
}
