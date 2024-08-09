import { useEffect, useRef, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { Observable, Subscription } from 'rxjs';
import { Client, createClient, RequestParams } from "graphql-sse";
import './App.css'

// https://the-guild.dev/graphql/sse/recipes
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
  subscription {
    mqttSubscription {
      payload
    }
  }
`, variables: {
  tenantId: "test"
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
