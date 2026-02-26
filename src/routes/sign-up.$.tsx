import { SignUp } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/sign-up/$')({
  component: SignUpPage,
})

function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <SignUp />
    </div>
  )
}
