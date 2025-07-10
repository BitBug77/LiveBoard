'use client';
import { useState } from 'react';
import { Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  
  // Validation states
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateEmail = (value: string) => {
    if (!value.trim()) {
      setEmailError('Email is required');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    } else {
      setEmailError('');
      return true;
    }
  };

  const validatePassword = (value: string) => {
    if (!value.trim()) {
      setPasswordError('Password is required');
      return false;
    } else {
      setPasswordError('');
      return true;
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    validateEmail(value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    validatePassword(value);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Validate all fields
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://127.0.0.1:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });
      
      const data = await response.json();
      console.log(data);
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      // Save token to local storage
      if (data.accessToken) {
        localStorage.setItem('authToken', data.accessToken);
        setSuccess(true);
      
        // You could redirect the user here or show a success message
        console.log('Login successful!');
        router.push('/whiteboard'); // Redirect to dashboard or another page
      } else {
        throw new Error('No token received from server');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to login. Please try again.');
      } else {
        setError('Failed to login. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-[#85ced5] rounded-xl border border-gray-200 shadow-sm p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-medium text-gray-800">Login</h1>
          <p className="text-gray-700 mt-2">Hello, welcome back</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg flex items-center">
            <AlertCircle size={18} className="mr-2" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-lg flex items-center">
            <CheckCircle size={18} className="mr-2" />
            <span>Login successful!</span>
          </div>
        )}
        
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="relative">
              <div className="absolute left-3 top-3 text-gray-500">
                <Mail size={20} />
              </div>
              <input
                type="email"
                placeholder="Email"
                className={`w-full pl-10 pr-4 py-3 rounded-full border ${
                  emailError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                } focus:outline-none focus:ring-2 focus:ring-[#716db0] focus:border-transparent`}
                value={email}
                onChange={handleEmailChange}
                onBlur={() => validateEmail(email)}
              />
            </div>
            {emailError && (
              <p className="text-red-600 text-sm ml-4">{emailError}</p>
            )}
          </div>
          
          <div className="space-y-1">
            <div className="relative">
              <div className="absolute left-3 top-3 text-gray-500">
                <Lock size={20} />
              </div>
              <input
                type="password"
                placeholder="Password"
                className={`w-full pl-10 pr-4 py-3 rounded-full border ${
                  passwordError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                } focus:outline-none focus:ring-2 focus:ring-[#716db0] focus:border-transparent`}
                value={password}
                onChange={handlePasswordChange}
                onBlur={() => validatePassword(password)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmit();
                  }
                }}
              />
            </div>
            {passwordError && (
              <p className="text-red-600 text-sm ml-4">{passwordError}</p>
            )}
          </div>
          
          <button 
            onClick={handleSubmit}
            className="w-full bg-[#716db0] hover:bg-[#615ca0] text-white font-medium py-3 px-4 rounded-lg transition duration-300 mt-2 flex justify-center"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Log in'}
          </button>
        </div>
        
        <div className="text-center mt-6">
          <p className="text-gray-700">
            Don&apos;t have an account? 
            <a href="signup" className="text-[#716db0] font-medium ml-1 hover:text-[#615ca0]">Sign Up</a>
          </p>
        </div>
      </div>
    </div>
  );
}