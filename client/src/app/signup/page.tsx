'use client';
import { useState } from 'react';
import { Mail, User, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  
  // Validation states
  const [emailError, setEmailError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value.trim()) {
      setEmailError('Email is required');
      return false;
    } else if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    } else {
      setEmailError('');
      return true;
    }
  };

  const validateUsername = (value: string) => {
    if (!value.trim()) {
      setUsernameError('Username is required');
      return false;
    } else if (value.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return false;
    } else {
      setUsernameError('');
      return true;
    }
  };

  const validatePassword = (value: string) => {
    if (!value.trim()) {
      setPasswordError('Password is required');
      return false;
    } else if (value.length < 6) {
      setPasswordError('Password must be at least 6 characters');
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

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    validateUsername(value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    validatePassword(value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate all fields
    const isEmailValid = validateEmail(email);
    const isUsernameValid = validateUsername(username);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isUsernameValid || !isPasswordValid) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://127.0.0.1:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          username,
          password,
        }),
      });
      
      const data = await response.json();
      console.log(data);
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      // Save token to local storage
      if (data.accessToken) {
        localStorage.setItem('authToken', data.accessToken);
        setSuccess(true);
        
        // You could redirect the user here or show a success message
        console.log('Registration successful!');
        router.push('/login'); // Redirect to home page or dashboard
      } else {
        throw new Error('No token received from server');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-[#fbecde] rounded-xl border border-gray-200 shadow-sm p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-medium text-gray-800">Sign up</h1>
          <p className="text-gray-600 mt-2">Just a few quick things to get started</p>
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
            <span>Registration successful! verify your email.</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <div className="relative">
              <div className="absolute left-3 top-3 text-gray-400">
                <Mail size={20} />
              </div>
              <input
                type="email"
                placeholder="Email"
                className={`w-full pl-10 pr-4 py-3 rounded-full border ${
                  emailError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                } focus:outline-none focus:ring-2 focus:ring-[#85ced5] focus:border-transparent`}
                value={email}
                onChange={handleEmailChange}
                onBlur={() => validateEmail(email)}
                required
              />
            </div>
            {emailError && (
              <p className="text-red-600 text-sm ml-4">{emailError}</p>
            )}
          </div>
          
          <div className="space-y-1">
            <div className="relative">
              <div className="absolute left-3 top-3 text-gray-400">
                <User size={20} />
              </div>
              <input
                type="text"
                placeholder="Username"
                className={`w-full pl-10 pr-4 py-3 rounded-full border ${
                  usernameError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                } focus:outline-none focus:ring-2 focus:ring-[#85ced5] focus:border-transparent`}
                value={username}
                onChange={handleUsernameChange}
                onBlur={() => validateUsername(username)}
                required
              />
            </div>
            {usernameError && (
              <p className="text-red-600 text-sm ml-4">{usernameError}</p>
            )}
          </div>
          
          <div className="space-y-1">
            <div className="relative">
              <div className="absolute left-3 top-3 text-gray-400">
                <Lock size={20} />
              </div>
              <input
                type="password"
                placeholder="Password"
                className={`w-full pl-10 pr-4 py-3 rounded-full border ${
                  passwordError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                } focus:outline-none focus:ring-2 focus:ring-[#85ced5] focus:border-transparent`}
                value={password}
                onChange={handlePasswordChange}
                onBlur={() => validatePassword(password)}
                required
              />
            </div>
            {passwordError && (
              <p className="text-red-600 text-sm ml-4">{passwordError}</p>
            )}
          </div>
          
          <button 
            type="submit"
            className="w-full bg-[#85ced5] hover:bg-[#76bfc6] text-white font-medium py-3 px-4 rounded-full transition duration-300 mt-2 flex justify-center"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        
        <div className="text-center mt-6">
          <p className="text-gray-600">
            Already have an account? 
            <a href="login" className="text-indigo-600 font-medium ml-1 hover:text-indigo-700">Log in</a>
          </p>
        </div>
      </div>
    </div>
  );
}