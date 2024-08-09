import { useEffect, useRef, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { Observable, Subscription } from 'rxjs';
import { Client, createClient, RequestParams } from "graphql-sse";
import './App.css'

export function toObservable(operation: RequestParams, client: Client) {
  return new Observable((observer) =>
    client.subscribe(operation, {
      next: (data) => {
        console.log('data', data);
        observer.next(data);
      },
      error: (err) => {
        console.error('error', err);
        observer.error(err);
      },
      complete: () => {
        console.log('complete');
        observer.complete();
      },
    }),
  );
}

function App() {
  const [count, setCount] = useState(0)

  const client = useRef(createClient({
    url: '/graphql',
    on: {
      connecting: () => console.log('connecting'),
      connected: () => {
        console.log('connected');
      },
      message: (message) => console.log('message', message),
    }
  }));
  const lol = useRef<Subscription | undefined>(undefined);

  useEffect(() => {
    if (lol.current) {
      return;
    }
    const observable = toObservable({
      query: `
  subscription dataSubscription($authorization: String, $tenantId: String) {
    subscriptionDataSubscription(authorization: $authorization, tenantId: $tenantId) {
      documentIds
    }
  }
`, variables: {
  authorization: "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJBZmtmcXRmOWs1eGw5ZWNGTXFPMkVHOTAzWGdWY3RNZlVoY3hGWnpYSU9JIn0.eyJleHAiOjE3MjMxOTYzMTYsImlhdCI6MTcyMzE2MzkxNiwianRpIjoiYjQ1OTBiOGMtZTA1Zi00MDEyLTlkODEtODU2ZjgzOTQ3OTYyIiwiaXNzIjoiaHR0cDovL2tleWNsb2FrOjgwODAvYXV0aC9yZWFsbXMvdGVuYW50LWFpbXotYWlteiIsImF1ZCI6WyJhaW16LWFpbXotY2xpZW50IiwiYWNjb3VudCJdLCJzdWIiOiJmNTE1NjJmMS03MjY5LTRhODUtYmMxMy02MzNjODg5YjMzM2YiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJuZWF0ZS1hdXRoLXByb3ZpZGVyIiwiYWNyIjoiMSIsInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJyZWFsbS1jbGllbnQtYWRtaW4iLCJvZmZsaW5lX2FjY2VzcyIsInRlbmFudC1haW16LWFpbXoiLCJkZWZhdWx0LXJvbGVzLXRlbmFudC1haW16LWFpbXoiLCJ1bWFfYXV0aG9yaXphdGlvbiJdfSwicmVzb3VyY2VfYWNjZXNzIjp7ImFpbXotYWltei1jbGllbnQiOnsicm9sZXMiOlsib3duZXIiLCJyZWFkZXIiLCJhZG1pbiIsIndyaXRlciJdfSwiYWNjb3VudCI6eyJyb2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJlbWFpbCBwcm9maWxlIiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJjbGllbnRIb3N0IjoiMTAuMC4yOS4zNyIsInByZWZlcnJlZF91c2VybmFtZSI6InNlcnZpY2UtYWNjb3VudC1uZWF0ZS1hdXRoLXByb3ZpZGVyIiwiY2xpZW50QWRkcmVzcyI6IjEwLjAuMjkuMzciLCJjbGllbnRfaWQiOiJuZWF0ZS1hdXRoLXByb3ZpZGVyIn0.ZStUMEF-1x3RzFVSyoNyJb5RpWAbwAY7qSNppcY4zLUElTOoXQ5CFJPcmGrxGdwj8BzwjUtUfvX0mNVsbZS6thDZS6kbFmdVa_NKYjDSstF0iKjSeukl660BNCkt0QHlq-ytVEbRBUBHLVn0dhVMHaKa7m03TqtkrtswcLtBFcdqJuoc8LtpgBs_af-1RKU-kczvyZV5e0FuBd6STeUNj5RhuQZZRYJFDCL5FSDfu-qgkWwJtE1oGknKPFFml0DhAojUCPhnFWZXMSAGOXEeLWS8e69wQcQd1-BLQjZzo8ONAKJL-gs02e2pxyGppvqcBdpOU7_Xz0WgCMyX5HjkHA",
  tenantId: "aimz"
}
    }, client.current);

    const subscription = observable.subscribe({
      next: (data) => {
        console.log('data', data);
      },
      error: (error) => {
        console.error('error', error);
      },
      complete: () => {
        console.log('complete');
      }
    });
    lol.current = subscription;
    console.log('subscription', subscription);
    // subscription.unsubscribe();
    observable.pipe().subscribe({ next: (data) => console.log('data', data) });
  }, []);

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
