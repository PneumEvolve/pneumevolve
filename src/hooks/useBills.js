import { useEffect, useState } from 'react';

export const useBills = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const res = await fetch('https://api.openparliament.ca/bills/?format=json');
        const data = await res.json();
        setBills(data.objects);
      } catch (error) {
        console.error('Error fetching bills:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, []);

  return { bills, loading };
};