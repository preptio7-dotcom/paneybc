import { redirect } from 'next/navigation'

export default function ResetPasswordRoot() {
    redirect('/auth/forgot-password')
}
