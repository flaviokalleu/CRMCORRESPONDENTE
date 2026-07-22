import React from "react";
import MoveisDetail from "../components/MoveisDetail"; // Adjust the path according to your project structure
import Navbar from "../components/landpage/Navbar"; // Import the Navbar component

const MoveisDetailPage = () => {
  return (
    <div className="bg-gray-100 min-h-screen py-8">
      <Navbar className="fixed top-0 left-0 right-0 z-10" />

      <div className="mt-24 pt-32">
        <MoveisDetail />
      </div>
    </div>
  );
};

export default MoveisDetailPage;
