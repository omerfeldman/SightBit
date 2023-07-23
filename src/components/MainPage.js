import React from "react";
import Live from "./Live";
import EventTable from "./EventTable";
import logo from '../sightbit.jpg'; 
function MainPage() {
  return (
    <div style={{ backgroundColor: '#778899', color: 'white', minHeight: '100vh', minWidth: '100vw' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center', 
      }}>
        <h1 style={{ fontSize: '4em' }}>SightBit</h1>
        <img src={logo} alt="logo" style={{ width: '100px', height: '100px', marginRight: '1em', padding: '1em' }} /> {/* Display the logo and make it larger */}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ width: '30%', margin: '0 auto' }}>
          <EventTable />
        </div>
        <div style={{ padding: '0 3em' }}>
          <Live />
        </div>
      </div>
    </div>
  );
}
export default MainPage;
