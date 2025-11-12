'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signupSchema } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

type SignupForm = {
  email: string
  password: string
  fullName: string
  role: 'admin' | 'teacher'
}

export default function SignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: undefined,
    },
  })

  const selectedRole = watch('role') || undefined

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true)
    try {
      const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            full_name: data.fullName,
            role: data.role,
          },
        },
      })

      if (signUpError) {
        toast.error(signUpError.message)
        return
      }

      if (!signUpData.user) {
        toast.error('Failed to create account')
        return
      }

      // Check if we have a session (email confirmation disabled)
      if (signUpData.session) {
        console.log('[Signup] Session exists, waiting for profile creation...')
        // Session exists, user is logged in
        // Wait and verify profile was created
        let profileCreated = false
        for (let i = 0; i < 5; i++) {
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Check if profile exists
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('role')
            .eq('id', signUpData.user.id)
            .single()
          
          if (profile && profile.role) {
            console.log('[Signup] Profile created with role:', profile.role)
            profileCreated = true
            break
          }
          
          if (i === 4) {
            console.error('[Signup] Profile not created after retries:', profileError)
          }
        }
        
        // Verify session is still valid
        const { data: { user: verifyUser } } = await supabase.auth.getUser()
        if (!verifyUser) {
          console.error('[Signup] Session expired after profile creation wait')
          toast.error('Session expired. Please log in.')
          router.push('/login')
          return
        }
        
        if (!profileCreated) {
          console.warn('[Signup] Profile may not be created yet, but redirecting anyway')
          toast.warning('Account created, but profile setup may be incomplete. Please refresh if you see an error.')
        }
        
        console.log('[Signup] User verified:', verifyUser.id, 'Redirecting to dashboard...')
        toast.success('Account created successfully! You are now logged in.')
        // Use window.location for full page reload to ensure cookies are synced with server
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 300)
      } else {
        // No session - try to sign in immediately (for testing when email confirmation is disabled)
        const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        })

        if (signInError) {
          console.error('Sign in error:', signInError)
          toast.success('Account created successfully! Please check your email to verify your account.')
          router.push('/login')
        } else if (signInData.session) {
          console.log('[Signup] Sign-in successful, waiting for profile creation...')
          // Wait and verify profile was created
          let profileCreated = false
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 500))
            
            // Check if profile exists
            const { data: profile, error: profileError } = await supabase
              .from('users')
              .select('role')
              .eq('id', signInData.user.id)
              .single()
            
            if (profile && profile.role) {
              console.log('[Signup] Profile created with role:', profile.role)
              profileCreated = true
              break
            }
            
            if (i === 4) {
              console.error('[Signup] Profile not created after retries:', profileError)
            }
          }
          
          // Verify session is still valid
          const { data: { user: verifyUser } } = await supabase.auth.getUser()
          if (!verifyUser) {
            console.error('[Signup] Session expired after profile creation wait')
            toast.error('Session expired. Please log in.')
            router.push('/login')
            return
          }
          
          if (!profileCreated) {
            console.warn('[Signup] Profile may not be created yet, but redirecting anyway')
            toast.warning('Account created, but profile setup may be incomplete. Please refresh if you see an error.')
          }
          
          console.log('[Signup] User verified:', verifyUser.id, 'Redirecting to dashboard...')
          toast.success('Account created successfully! You are now logged in.')
          // Use window.location for full page reload to ensure cookies are synced with server
          setTimeout(() => {
            window.location.href = '/dashboard'
          }, 300)
        } else {
          toast.success('Account created successfully! Please check your email to verify your account.')
          router.push('/login')
        }
      }
    } catch (error: any) {
      console.error('Signup error:', error)
      toast.error(error.message || 'An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign Up</CardTitle>
          <CardDescription>Create a new account to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                {...register('fullName')}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={selectedRole ?? ''}
                onValueChange={(value) => setValue('role', value as 'admin' | 'teacher', { shouldValidate: true })}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-destructive">{errors.role.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </Button>

            <div className="text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

