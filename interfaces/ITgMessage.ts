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
