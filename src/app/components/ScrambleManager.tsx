'use client';

import { Container, Button, Form, InputGroup } from 'react-bootstrap';
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import axios from 'axios';
import type { Competition } from '@/lib/Structures';

const ScrambleManager = () => 
{
    const [competitionID, setCompetitionID] = useState<string>('');
    const [wcif, setWCIF] = useState<Competition|null>(null);
    const [scrambleZip, setScrambleZip] = useState<File|null>(null);
    const [downloadURL, setDownloadURL] = useState<string>('');

    const onFetchWCIFClick = async () =>
    {
        if (competitionID == '')
        {
            alert('Please type in the competition ID');
            return;
        }

        try 
        {
            const response = await axios.get(`https://www.worldcubeassociation.org/api/v0/competitions/${competitionID}/wcif/public`);

            setWCIF(response.data as Competition);
            console.log('WCIF:', response.data);

            alert(`Fetched WCIF for ${response.data.name}`);
        } catch (error) {
            console.error('Error fetching WCIF:', error);
            alert('Failed to fetch WCIF');
        }
    }

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setScrambleZip(file);
    };

    const onSubmitZipClick = async () =>
    {
        if (!wcif || !scrambleZip)
        {
            alert('Please input the competition ID and upload the scramble zip file before submit.')
            return;
        }

        try 
        {
            const formData = new FormData();
            formData.append('wcif', JSON.stringify(wcif));
            formData.append('file', scrambleZip);

            const response = await axios.post('/api/scramble-upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                responseType: 'blob', // important for binary data
            });

            const blob = new Blob([response.data], { type: 'application/zip' });
            const url = URL.createObjectURL(blob);
            setDownloadURL(url);

            alert('Task done. You can now download the reorganized ZIP.');
        } catch (error) {
            console.error('Error calling API:', error);
            alert('Failed to process the result');
        }
    }

    const onDownloadClick = () =>
    {
        if (!downloadURL) return;

        const a = document.createElement('a');
        a.href = downloadURL;
        a.download = `Reorganized-${competitionID}.zip`; // desired filename
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Optional: release the object URL
        URL.revokeObjectURL(downloadURL);
    }

    return (
        <Container>
            <h1 className='my-3'>Scramble Manager</h1>

            <Container className='p-3'>
                <InputGroup className='mx-auto w-50 mb-3'>
                    <Form.Control
                        placeholder='Competition ID (For WCIF)'
                        aria-label='Competition ID (For WCIF)'
                        onChange={(e) => setCompetitionID(e.target.value)}
                    />
                    <Button variant='dark' onClick={onFetchWCIFClick}>Fetch WCIF</Button>
                </InputGroup>
                <InputGroup className='mx-auto w-50'>
                    <Form.Control
                        type='file'
                        accept='.zip'
                        placeholder='Scrambles .zip File'
                        aria-label='Scrambles .zip File'
                        onChange={handleFileChange}
                    />
                    <Button variant='dark' onClick={onSubmitZipClick}>Submit</Button>
                </InputGroup>
                <div className='text-center mt-3'>
                    <Button variant='success' disabled={!downloadURL} onClick={onDownloadClick}>
                        Download reorganized .zip
                    </Button>
                </div>
            </Container>
        </Container>
    );
}

export default ScrambleManager;