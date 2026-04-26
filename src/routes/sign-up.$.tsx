import { SignUp } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/sign-up/$')({
  component: SignUpPage,
})

function SignUpPage() {
  return (
    <div className="flex items-center justify-center p-4">
      <SignUp />
    </div>
  )
}
