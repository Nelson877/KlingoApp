/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")], // This is the CRITICAL line!
  theme: {
    extend: {
      colors: {
        primary: '#059669', 
        primaryDark: '#065f46', 
        secondary: '#6b7280', 
        accent: '#92400e', 
      },
    },
  },
  plugins: [],
}