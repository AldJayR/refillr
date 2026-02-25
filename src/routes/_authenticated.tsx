import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'

const getAuthState = createServerFn({ method: 'GET' }).handler(async () => {
    const { userId } = await auth()
    return { userId }
})

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
