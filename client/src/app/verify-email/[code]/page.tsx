'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const EmailVerificationPage = () => {
  const router = useRouter();
  
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      // Get token from the URL path
      // In App Router, we need to extract it differently
      const token = window.location.pathname.split('/').pop();
      
      // Make sure we have a token before making the request
      if (!token) {
        setStatus('error');
        setErrorMessage('No verification token found in the URL.');
        return;
      }

      try {
        setStatus('verifying');
        
        // Make a request to your backend API
        await axios.get(`http://127.0.0.1:5000/api/auth/verify/${token}`);
        
        // If we get here, verification was successful
        setStatus('success');
        
        // Redirect to login after a short delay (to show success message)
        setTimeout(() => {
          router.push('/login');
        }, 2000);
        
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        
        // Extract error message from response if available
        if (axios.isAxiosError(error) && error.response?.data?.message) {
          setErrorMessage(error.response.data.message);
        } else {
          setErrorMessage('An unexpected error occurred during verification.');
        }
      }
    };

    verifyEmail();
  }, [router]);

  // Render appropriate UI based on status
  return (
    <>
      <title>Email Verification</title>
      
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-md">
          {status === 'verifying' && (
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Verifying Your Email</h2>
              <div className="mt-8 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Please wait while we verify your email address...
              </p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Email Verified!</h2>
              <div className="mt-8 flex justify-center">
                <svg className="h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Your email has been successfully verified. Redirecting you to login...
              </p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Verification Failed</h2>
              <div className="mt-8 flex justify-center">
                <svg className="h-16 w-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                {errorMessage || 'Sorry, we couldn\'t verify your email. The verification link may be expired or invalid.'}
              </p>
              <div className="mt-6">
                <button
                  onClick={() => router.push('/login')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Return to Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default EmailVerificationPage;