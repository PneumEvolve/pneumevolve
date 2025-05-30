import React from "react";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/button";
import { BarChart2, FileText, Brain, Vote, ShieldCheck } from "lucide-react";
import { useBills } from "../hooks/useBills";

const WeChoose = () => {
  const { bills, loading } = useBills();

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-center">We Choose</h1>
      <p className="text-center text-lg text-gray-600">
        See the world you want to live in. Learn, vote, compare, evolve.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <FileText className="w-6 h-6" />
            <span>Current Policies</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <Vote className="w-6 h-6" />
            <span>Cast Mock Vote</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <BarChart2 className="w-6 h-6" />
            <span>Compare Results</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <Brain className="w-6 h-6" />
            <span>Learn and Test Knowledge</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <ShieldCheck className="w-6 h-6" />
            <span>Proof of Humanity</span>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Current Bills</h2>
        {loading ? (
          <p>Loading bills...</p>
        ) : (
          bills.map((bill, index) => (
            <Card key={`${bill.number}-${index}`}>
              <CardContent className="p-4 space-y-2">
                <h3 className="text-lg font-semibold">{bill.short_title || bill.title || 'Untitled Bill'}</h3>
                <p><strong>Bill:</strong> {bill.number}</p>
                <p><strong>Sponsor:</strong> {bill.sponsor?.name}</p>
                <p><strong>Status:</strong> {bill.status}</p>
                <a
                  href={`https://openparliament.ca/bills/${bill.session || 'current'}/${bill.number.toLowerCase()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  View Full Bill
                </a>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default WeChoose;
