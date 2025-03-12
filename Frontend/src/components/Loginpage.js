import React, { useState } from "react";
import { Link } from "react-router-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Email:", email, "Password:", password);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex justify-center">
      <div className="max-w-screen-xl m-0 sm:m-10 bg-gray-800 shadow sm:rounded-lg flex justify-center flex-1">
        <div className="lg:w-1/2 xl:w-5/12 p-6 sm:p-12">
          <div>
            <DotLottieReact
              src="https://lottie.host/773ce559-7fb2-4f69-ac91-e15477f422dc/aKNAIp3GK6.lottie"
              loop
              autoplay
              style={{ width: "300px", height: "300px" }} // Adjust size here
            />
          </div>
          <div className="mt-12 flex flex-col items-center">
            <h1 className="text-2xl xl:text-3xl font-extrabold text-gray-400">Sign In</h1>
            <div className="w-full flex-1 mt-8">
              <form className="mx-auto max-w-xs" onSubmit={handleSubmit}>
              

                <input
                  className="w-full px-8 py-4 rounded-lg font-medium bg-gray-700 border border-gray-600 placeholder-gray-400 text-sm focus:outline-none focus:border-gray-500 focus:bg-gray-600"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  className="w-full px-8 py-4 rounded-lg font-medium bg-gray-700 border border-gray-600 placeholder-gray-400 text-sm focus:outline-none focus:border-gray-500 focus:bg-gray-600 mt-5"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="mt-5 tracking-wide font-semibold bg-indigo-500 text-gray-100 w-full py-4 rounded-lg hover:bg-indigo-700 transition-all duration-300 ease-in-out flex items-center justify-center focus:outline-none focus:shadow-outline"
                >
                  <span className="ml-3 font-bold text-gray-400">Sign In</span>
                </button>
              </form>
              <Link
                to="/SignupPage"
                className="mt-4 font-bold text-gray-400 hover:underline"
              >
                Don't have an account? Sign Up
              </Link>
             
            </div>
          </div>
        </div>
        <div className="flex-1 bg-gray-700 text-center hidden lg:flex">
          <div
            className="m-12 xl:m-16 w-full bg-contain bg-center bg-no-repeat"
            style={{
              backgroundImage:
                "url('https://storage.googleapis.com/devitary-image-host.appspot.com/15848031292911696601-undraw_designer_life_w96d.svg')",
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
