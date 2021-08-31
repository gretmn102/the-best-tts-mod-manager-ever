import * as React from 'react';
import * as E from "fp-ts/lib/Either"

import { useAppSelector, useAppDispatch } from '../../app/hooks';
import {
  parseSaveReq,
  selectStatus,
  States,
  parse
} from './backuperSlice';
import styles from './Backuper.module.css';
import * as Shared from '_/main/shared/structures/API';

var dispatch: any;

window.addEventListener('message', (event) => {
  console.log(`resp: ${event.source} ${event.data}`);
  var resp = event.data
  dispatch(parse(resp))
})

export function Backuper() {
  const count = useAppSelector(selectStatus);
  dispatch = useAppDispatch();
  console.log("Backuper created");

  const [savePath, setSavePath] = React.useState('');
  const input =
    (
      <div>
        <div className={styles.row}>
          <input
            className={styles.textbox}
            aria-label="Set increment amount"
            value={savePath}
            onChange={(e) => setSavePath(e.target.value)}
          />
          <button
            className={styles.asyncButton}
            onClick={() => dispatch(parseSaveReq(savePath))}
          >
            Add Async
          </button>
        </div>
      </div>
    );

  function getResolved() {
    switch (count[0]) {
      case States.RESOLVED: {
        let [_, x] = count
        const res =
          E.fold(
            ((err:Shared.ErrorMsg) => <div>{err}</div>),
            ((x:Shared.Data) => <ol>{x.urls.map(x => <li>{x}</li>)}</ol>)
          ) (x)
        return res
      }
      default:
        fail(`Expected States.RESOLVED but ${count[0]}`)
        break;
    }
  }

  switch (count[0]) {
    case States.IDLE: {
      return input
    }
    case States.RESOLVED: {
      return (
        <div>
          <div>{getResolved()}</div>
          <div>{input}</div>
        </div>
      )
    }
    case States.LOADING: {
      return (
        <div>Loading...</div>
      )
    }
    default:
      return <div></div>
  }
}