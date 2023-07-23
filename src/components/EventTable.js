
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { Table } from '@nextui-org/react'; 


const EventTable = () => {
  const [rows, setRows] = useState([]);

  useEffect(() => {
     const socket = io('http://localhost:5000');

       //mock for checking other posts from different
       const postData = async () => {
        try {
          const objectsToPost = [
            {
              id: 1,
              message: 'rip current got stronger',
              severity: 2,
            },
            {
              id: 2,
              message: 'unattended child on the beach ',
              severity: 1,
            },
            {
              id: 3,
              message: 'swimmer in dangerous water',
              severity: 3,
            }
          ];
     
          const response = await axios.post('http://localhost:5000/event1', objectsToPost);

      } catch (error) {
          console.log('Error:', error);
      }
    };
    
    postData();
  //recieve data from other backend services
  socket.on('message-services', (message) => {
     console.log(message);
     message.forEach(obj => {
      setRows(prevRows => [...prevRows, obj]);
    });
  });

    // Clean up when unmounting
    return () => {
      socket.off('message-services');
    };
  }, []);  // Empty dependency array - this effect runs once on mount, and cleanup runs on unmount

  const getColor = (severity) => {
    switch(severity) {
      case 1:
        return 'green';
      case 2:
        return 'yellow';
      case 3:
        return 'red';
      default:
        return '';
    }
  }
  
  const columns = [
    {
      key: "id",
      label: "ID",
    },
    {
      key: "message",
      label: "MESSAGE",
    },
    {
      key: "severity",
      label: "SEVERITY",
    },
  ];

  return (
    <Table
      aria-label="Example table with dynamic content"
      css={{
        height: "auto",
        minWidth: "100%",
        backgroundColor: "white", // Add this line
      }}
    >
      <Table.Header columns={columns}>
        {(column) => (
          <Table.Column key={column.key}>{column.label}</Table.Column>
        )}
      </Table.Header>
      <Table.Body items={rows}>
        {(item) => (
          <Table.Row key={item.key}>
            {(columnKey) => 
              <Table.Cell css={{ backgroundColor: columnKey === "severity" ? getColor(item[columnKey]) : ''}}>
                {item[columnKey]}
              </Table.Cell>
            }
          </Table.Row>
        )}
      </Table.Body>
    </Table>
  );
}

export default EventTable;