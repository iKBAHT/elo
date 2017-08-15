export interface ITgMessage {
  message_id: number,
  from: {
    id: number,
    first_name: string,
    last_name: string,
    username: string
  },
  chat: {
    id: number,
    title: string,
    type: string,
    all_members_are_administrators: boolean,
  },
  date: number,
  text: string
}

// {"message_id":37,"from":{"id":75917596,"first_name":"ilnur","last_name":"adelmurzin","username":"iKBAHT","language_code":"ru-RU"},"chat":{"id":-249714383,"title":"test with elo bot","type":"group","all_members_are_administrators":false},"date":1502820247,"text":"/sendpic ass","entities":[{"type":"bot_command","offset":0,"length":8}]}