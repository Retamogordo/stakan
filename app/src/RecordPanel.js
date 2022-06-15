function RecordPanel(props) {

    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!, ", props);
    const { records, ...rest } = props;

    const recordList= records.map(
        (record) => <li key={record.key}>{record.score}</li> 
    )

    return (
        <div className="RecordPanel">
            <ul>{recordList}</ul>
        </div>
    )
}

export default RecordPanel;