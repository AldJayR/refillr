import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { getAuthState } from '@/server/user.functions'

export const Route = createFileRoute('/_authenticated')({
    beforeLoad: async () => {
        const { userId } = await getAuthState()
        if (!userId) {
            throw redirect({ to: '/sign-in' })
        }
        return { userId }
    },
    component: () => <Outlet />,
})
